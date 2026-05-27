// Global State variables from index.html
let currentUser = null;
let allTasks = [], allIssues = [], allDepartments = [], allUsers = [], allDependencies = [];
let filteredUsers = [], filteredTasks = [], filteredIssues = [], filteredDepartments = [], filteredDependencies = [];
let allReportTasks = [], filteredReportTasks = [];
let reportSortKey = 'id', reportSortAsc = true;
let allNotifications = [], filteredNotifications = [];
let notifTasksList = [], notifIssuesList = [];

// ==================== AWESOME ALERT ====================
function showAwesomeAlert(title, message, type = 'success') {
    const modal = new bootstrap.Modal(document.getElementById('messageModal'));
    const header = $('#messageModalHeader'), iconContainer = $('#messageModalIconContainer');
    header.removeClass('modal-header-success modal-header-danger modal-header-warning').css('background','');
    iconContainer.empty();
    if (type === 'success') { header.addClass('modal-header-success'); iconContainer.html('<i class="bi bi-check-circle-fill text-success" style="font-size:3rem;"></i>'); }
    else if (type === 'error') { header.addClass('modal-header-danger'); iconContainer.html('<i class="bi bi-x-circle-fill text-danger" style="font-size:3rem;"></i>'); }
    else if (type === 'warning') { header.addClass('modal-header-warning'); iconContainer.html('<i class="bi bi-exclamation-triangle-fill text-warning" style="font-size:3rem;"></i>'); }
    else { header.css('background','linear-gradient(135deg,var(--primary-color),var(--secondary-color))'); iconContainer.html('<i class="bi bi-info-circle-fill text-primary" style="font-size:3rem;"></i>'); }
    $('#messageModalTitle').text(title); $('#messageModalBody').text(message); modal.show();
}

// ==================== INIT ====================
$(document).ready(function() {
    const userData = localStorage.getItem('pmYajurUser');
    if (userData) { try { currentUser = JSON.parse(userData); showApp(); } catch(e) { localStorage.removeItem('pmYajurUser'); } }
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now()+7*24*60*60*1000).toISOString().split('T')[0];
    $('#newTaskStartDate').val(today); $('#newTaskDueDate').val(nextWeek); $('#newIssueDueDate').val(nextWeek);
    $('#loginForm').submit(function(e) { e.preventDefault(); login(); });
    [].slice.call(document.querySelectorAll('#mainTabs button')).forEach(function(el) {
        el.addEventListener('shown.bs.tab', function(event) {
            const target = event.target.getAttribute('data-bs-target');
            setTimeout(() => {
                switch(target) {
                    case '#dashboard':    loadDashboardData(); break;
                    case '#user':         loadUsers(); break;
                    case '#department':   loadDepartments(); break;
                    case '#task':         loadTasks(); break;
                    case '#issue':        loadIssues(); break;
                    case '#dependency':   loadDependencies(); break;
                    case '#report':       loadReport(); break;
                    case '#notification': loadNotifications(); break;
                }
            }, 100);
        });
    });
});

// ==================== AUTH ====================
function login() {
    const username = $('#username').val(), password = $('#password').val();
    const loginBtn = $('#loginForm button[type="submit"]'), orig = loginBtn.html();
    loginBtn.html('<span class="spinner-border spinner-border-sm"></span> Logging in...').prop('disabled', true);
    google.script.run
        .withSuccessHandler(function(r) { loginBtn.html(orig).prop('disabled', false); if (r && r.success) { currentUser = r; localStorage.setItem('pmYajurUser', JSON.stringify(r)); showApp(); } else { showError(r ? r.message : 'Login failed'); } })
        .withFailureHandler(function(err) { loginBtn.html(orig).prop('disabled', false); showError('Login failed: ' + err.message); })
        .loginUser(username, password);
}
function logout() { localStorage.removeItem('pmYajurUser'); currentUser = null; $('#app-container').addClass('d-none'); $('#login-screen').removeClass('d-none'); $('#loginForm')[0].reset(); }
function showApp() {
    $('#login-screen').addClass('d-none'); $('#app-container').removeClass('d-none');
    $('#user-fullname').text(currentUser.fullName); $('#user-role').text(currentUser.role);
    $('#current-user').text(currentUser.fullName); $('#current-department').text(currentUser.department || 'No Department');
    $('#user-avatar').text(currentUser.fullName.charAt(0).toUpperCase());
    currentUser.role === 'Admin' ? $('#user-tab-item').show() : $('#user-tab-item').hide();
    loadDashboardData();
}
function showError(msg) { $('#login-error').text(msg).removeClass('d-none'); setTimeout(() => $('#login-error').addClass('d-none'), 5000); }

// ==================== DASHBOARD ====================
function loadDashboardData() { loadDashboardCounts(); loadMyTasks(); loadMyIssues(); }
function loadDashboardCounts() {
    google.script.run.withSuccessHandler(function(r) {
        if (r && r.success) { $('#open-tasks-count').text(r.data.openTasks||0); $('#closed-tasks-count').text(r.data.closedTasks||0); $('#open-issues-count').text(r.data.openIssues||0); $('#closed-issues-count').text(r.data.closedIssues||0); }
    }).getDashboardCounts(currentUser.id, currentUser.role);
}
function loadMyTasks() {
    const tbody = $('#my-tasks-body'); tbody.empty();
    google.script.run.withSuccessHandler(function(r) {
        if (r && r.success) {
            const tasks = Array.isArray(r.data) ? r.data.slice(0,5) : [];
            if (!tasks.length) { tbody.append('<tr><td colspan="4" class="text-center text-muted py-4">No active tasks found</td></tr>'); return; }
            tasks.forEach(t => tbody.append(`<tr><td><strong>${t.id}</strong></td><td>${t.name}</td><td><span class="status-badge ${getStatusClass(t.status)}">${t.status}</span></td><td><div class="progress-container"><div class="double-progress"><div class="progress-bar-auto" style="width:${t.autoProgress||0}%"></div><div class="progress-bar-manual" style="width:${t.completion||0}%"></div></div><span class="ms-1">${t.completion||0}%</span></div></td></tr>`));
        }
    }).getTasks('Open Task', currentUser.id, currentUser.role);
}
function loadMyIssues() {
    const tbody = $('#my-issues-body'); tbody.empty();
    google.script.run.withSuccessHandler(function(r) {
        if (r && r.success) {
            const issues = Array.isArray(r.data) ? r.data.slice(0,5) : [];
            if (!issues.length) { tbody.append('<tr><td colspan="4" class="text-center text-muted py-4">No issues found</td></tr>'); return; }
            issues.forEach(i => tbody.append(`<tr><td><strong>${i.id}</strong></td><td>${i.name}</td><td><span class="status-badge ${getStatusClass(i.status)}">${i.status}</span></td><td><span class="severity-badge ${getPriorityClass(i.severity)}">${i.severity}</span></td></tr>`));
        }
    }).getIssues('View by Owner', currentUser.id, currentUser.role);
}

// ==================== TASKS ====================
function loadTasks() {
    const filter = $('#task-filter').val();
    google.script.run.withSuccessHandler(function(r) {
        if (r && r.success) { allTasks = Array.isArray(r.data)?r.data:[]; filteredTasks=[...allTasks]; renderTasks(filteredTasks); populateGroupFilter(r.groups,'task-group-filter'); }
        else { $('#tasks-body').html(`<tr><td colspan="16" class="text-center text-danger py-4">${r?r.message:'Error'}</td></tr>`); }
    }).getTasks(filter, currentUser.id, currentUser.role);
}
function renderTasks(tasks) {
    const tbody = $('#tasks-body'); tbody.empty();
    if (!tasks.length) { tbody.append('<tr><td colspan="16" class="text-center text-muted py-4">No tasks found</td></tr>'); return; }
    const parentTasks=[], childMap={};
    tasks.forEach(t => { if(t.parentTaskId){if(!childMap[t.parentTaskId])childMap[t.parentTaskId]=[];childMap[t.parentTaskId].push(t);}else{parentTasks.push(t);} });
    parentTasks.sort((a,b)=>a.id.localeCompare(b.id));
    function createRow(task, isSub=false) {
        const sc=getStatusClass(task.status), pc=getPriorityClass(task.priority);
        const mp=task.completion||0, ap=task.autoProgress||0, ac=getHeatmapColor(ap), atc=(ac==='#ffc107')?'#664d03':ac;
        let dl='-',dls='';
        if(task.dueDate){const due=new Date(task.dueDate),now=new Date(),d=Math.ceil((due-now)/(1000*60*60*24));if(d<0){dl=Math.abs(d)+' days overdue';dls='color:#dc3545;font-weight:bold;';}else{dl=d+' days';if(d<=2)dls='color:#ffc107;font-weight:bold;';}}
        let tog='';
        if(!isSub&&childMap[task.id]&&childMap[task.id].length>0){tog=`<span class="subtask-toggle" onclick="toggleSubtasks('${task.id}',this)">+</span>`;}else if(!isSub){tog='<span style="display:inline-block;width:15px;margin-right:5px;"></span>';}
        let idHtml=`<strong>${task.id}</strong>`;
        if(task.dependency==='Yes'){idHtml=`<strong class="clickable-id" onclick="handleTaskClick('${task.id}','${task.dependency}')">${task.id}</strong>`;}
        const rc=isSub?`subtask-row parent-${task.parentTaskId} d-none`:'', ns=isSub?'subtask-indent':'';
        return `<tr class="${rc}"><td>${tog}${idHtml}</td><td class="${ns}">${isSub?'<i class="bi bi-arrow-return-right subtask-icon"></i>':''}${task.name}</td><td>${task.description||'-'}</td><td>${task.department||'-'}</td><td>${task.owner||'-'}</td><td><span class="status-badge ${sc}">${task.status}</span></td><td>${task.tags||'-'}</td><td>${formatDate(task.startDate)}</td><td>${formatDate(task.dueDate)}</td><td style="${dls}">${dl}</td><td><span class="priority-badge ${pc}">${task.priority||'None'}</span></td><td><div class="progress-wrapper"><div class="progress-row"><div class="progress-track"><div class="progress-fill" style="width:${mp}%;background:#0d6efd;"></div></div><div class="progress-text" style="color:#0d6efd">${mp}%</div></div><div class="progress-row"><div class="progress-track"><div class="progress-fill" style="width:${ap}%;background:${ac};"></div></div><div class="progress-text" style="color:${atc}">${ap}%</div></div></div></td><td>${task.group||'-'}</td><td>${task.parentTaskId||'-'}</td><td><select class="form-select form-select-sm" style="width:70px;" onchange="updateTaskDependency('${task.id}',this.value)"><option value="No" ${task.dependency!=='Yes'?'selected':''}>No</option><option value="Yes" ${task.dependency==='Yes'?'selected':''}>Yes</option></select></td><td><div class="action-buttons"><button class="action-btn" onclick="editTask('${task.id}')" title="Edit"><i class="bi bi-pencil"></i></button><button class="action-btn" onclick="viewTask('${task.id}')" title="View"><i class="bi bi-eye"></i></button><button class="action-btn" onclick="deleteItem('${task.id}','task')" ${currentUser.role!=='Admin'&&currentUser.id!==task.owner?'disabled':''} title="Delete"><i class="bi bi-trash"></i></button></div></td></tr>`;
    }
    parentTasks.forEach(p=>{tbody.append(createRow(p,false));if(childMap[p.id])childMap[p.id].forEach(c=>tbody.append(createRow(c,true)));});
}
function toggleSubtasks(pid,el){document.querySelectorAll(`.parent-${pid}`).forEach(r=>{r.classList.toggle('d-none');});el.textContent=el.textContent==='+'?'-':'+';}
function updateTaskDependency(tid,val){google.script.run.withSuccessHandler(r=>{if(r.success)loadTasks();else showAwesomeAlert('Error',r.message,'error');}).updateTask(tid,{dependency:val});}
function handleTaskClick(tid,dep){if(dep==='Yes'){const t=document.querySelector('#dependency-tab');if(t){new bootstrap.Tab(t).show();setTimeout(()=>{$('#dependency-search').val(tid);searchDependencies();},500);}}}
function searchTasks(){const s=$('#task-search').val().toLowerCase(),g=$('#task-group-filter').val();filteredTasks=allTasks.filter(t=>{const sm=!s||t.name.toLowerCase().includes(s)||t.id.toLowerCase().includes(s)||(t.description&&t.description.toLowerCase().includes(s))||(t.tags&&t.tags.toLowerCase().includes(s));const gm=!g||t.group===g;return sm&&gm;});renderTasks(filteredTasks);}
function filterTasksByGroup(){searchTasks();}
function showNewTaskModal(){
    google.script.run.withSuccessHandler(r=>{if(r&&r.success){const ds=$('#newTaskDeptSelect');ds.empty().append('<option value="">Select Department</option>');r.data.forEach(d=>ds.append(`<option value="${d.name}">${d.name}</option>`));}}).getDepartmentList();
    google.script.run.withSuccessHandler(r=>{if(r&&r.success){const os=$('#newTaskOwnerSelect'),ds=$('#newTaskDoerSelect');os.empty().append('<option value="">Select Owner</option>');ds.empty().append('<option value="">Select Doer</option>');r.data.forEach(u=>{os.append(`<option value="${u.id}">${u.name} (${u.department||'No Dept'})</option>`);ds.append(`<option value="${u.username}">${u.username}</option>`);});}}).getAllActiveUsers();
    google.script.run.withSuccessHandler(r=>{if(r&&r.success){const ps=$('#newTaskParentSelect');ps.empty().append('<option value="">Select Parent Task</option>');r.data.forEach(t=>ps.append(`<option value="${t.id}">${t.id} - ${t.name}</option>`));}}).getTasks('All Task',currentUser.id,currentUser.role);
    new bootstrap.Modal(document.getElementById('newTaskModal')).show();
}
function toggleSubtaskField(){$('#isSubtaskCheckbox').is(':checked')?$('#subtask-field').show():$('#subtask-field').hide();}
function createNewTask(){
    const form=$('#newTaskForm');const fd={};form.serializeArray().forEach(i=>{fd[i.name]=i.value;});
    if(!fd.name||!fd.department||!fd.startDate||!fd.dueDate){showAwesomeAlert('Missing Fields','Please fill all required fields (*).','warning');return;}
    if(fd.startDate>fd.dueDate){showAwesomeAlert('Invalid Date','Start date cannot be after due date.','warning');return;}
    if($('#isSubtaskCheckbox').is(':checked')&&!fd.parentTaskId){showAwesomeAlert('Missing Parent','Please select a parent task.','warning');return;}
    google.script.run.withSuccessHandler(r=>{if(r.success){showAwesomeAlert('Success','Task created successfully!','success');$('#newTaskModal').modal('hide');form[0].reset();loadTasks();loadDashboardData();}else{showAwesomeAlert('Error',r.message,'error');}}).createTask(fd,currentUser.id);
}
function editTask(tid){
    const task=allTasks.find(t=>t.id===tid);
    if(task){
        $('#edit-task-id').val(tid);$('#edit-task-status').val(task.status);$('#edit-task-completion').val(task.completion||0);$('#edit-task-priority').val(task.priority||'Medium');$('#completion-value').text((task.completion||0)+'%');
        google.script.run.withSuccessHandler(r=>{if(r&&r.success){const s=$('#edit-task-owner');s.empty().append('<option value="">Select Owner</option>');r.data.forEach(u=>s.append(`<option value="${u.id}" ${u.id===task.owner?'selected':''}>${u.name} (${u.department||'No Dept'})</option>`));}}).getAllActiveUsers();
        $('#edit-task-completion').off('input').on('input',function(){$('#completion-value').text(this.value+'%');});
        new bootstrap.Modal(document.getElementById('editTaskModal')).show();
    }
}
function updateTaskDetails(){
    const tid=$('#edit-task-id').val();
    const upd={status:$('#edit-task-status').val(),completion:parseInt($('#edit-task-completion').val()),priority:$('#edit-task-priority').val(),owner:$('#edit-task-owner').val()};
    google.script.run.withSuccessHandler(r=>{if(r.success){showAwesomeAlert('Success','Task updated!','success');$('#editTaskModal').modal('hide');loadTasks();loadDashboardData();}else{showAwesomeAlert('Error',r.message,'error');}}).updateTask(tid,upd);
}
function viewTask(tid){
    const task=allTasks.find(t=>t.id===tid);
    if(task){
        const fields=[{l:'Task ID',v:task.id},{l:'Task Name',v:task.name},{l:'Description',v:task.description||'-'},{l:'Department',v:task.department},{l:'Owner',v:task.owner},{l:'Status',v:task.status},{l:'Tags',v:task.tags||'-'},{l:'Start Date',v:formatDate(task.startDate)},{l:'Due Date',v:formatDate(task.dueDate)},{l:'Priority',v:task.priority},{l:'Completion %',v:(task.completion||0)+'%'},{l:'Group',v:task.group||'-'},{l:'Created Date',v:formatDate(task.createdDate)},{l:'Auto Progress %',v:(task.autoProgress||0)+'%'},{l:'Parent Task ID',v:task.parentTaskId||'-'},{l:'Dependency',v:task.dependency||'No'}];
        $('#viewTaskTableBody').html(fields.map(f=>`<tr><th width="35%">${f.l}</th><td>${f.v}</td></tr>`).join(''));
        new bootstrap.Modal(document.getElementById('viewTaskModal')).show();
    }
}

// ==================== ISSUES ====================
function loadIssues(){
    const filter=$('#issue-filter').val();
    google.script.run.withSuccessHandler(r=>{if(r&&r.success){allIssues=Array.isArray(r.data)?r.data:[];filteredIssues=[...allIssues];renderIssues(filteredIssues);populateDepartmentFilterFromGroups(r.groups,'issue-department-filter');}}).getIssues(filter,currentUser.id,currentUser.role);
}
function renderIssues(issues){
    const tbody=$('#issues-body');tbody.empty();
    if(!issues.length){tbody.append('<tr><td colspan="15" class="text-center text-muted py-4">No issues found</td></tr>');return;}
    issues.forEach(i=>{
        const sc=getStatusClass(i.status),sv=getPriorityClass(i.severity),mp=i.manualProgress||0,ap=i.autoProgress||0,ac=getHeatmapColor(ap),atc=(ac==='#ffc107')?'#664d03':ac;
        tbody.append(`<tr><td><strong>${i.id}</strong></td><td>${i.name}</td><td>${i.description||'-'}</td><td>${i.department||'-'}</td><td>${i.reporter||'-'}</td><td>formatDate(i.createdTime)</td><td>${i.assignee||'-'}</td><td>${i.tags||'-'}</td><td>${formatDate(i.dueDate)}</td><td><div class="progress-wrapper"><div class="progress-row"><div class="progress-track"><div class="progress-fill" style="width:${mp}%;background:#0d6efd;"></div></div><div class="progress-text" style="color:#0d6efd">${mp}%</div></div><div class="progress-row"><div class="progress-track"><div class="progress-fill" style="width:${ap}%;background:${ac};"></div></div><div class="progress-text" style="color:${atc}">${ap}%</div></div></div></td><td><span class="status-badge ${sc}">${i.status}</span></td><td><span class="severity-badge ${sv}">${i.severity}</span></td><td>${i.classification||'-'}</td><td>${i.flag||'-'}</td><td><div class="action-buttons"><button class="action-btn" onclick="editIssue('${i.id}')" title="Edit"><i class="bi bi-pencil"></i></button><button class="action-btn" onclick="viewIssue('${i.id}')" title="View"><i class="bi bi-eye"></i></button><button class="action-btn" onclick="deleteItem('${i.id}','issue')" ${currentUser.role!=='Admin'&&currentUser.id!==i.assignee?'disabled':''} title="Delete"><i class="bi bi-trash"></i></button></div></td></tr>`);
    });
}
function searchIssues(){const s=$('#issue-search').val().toLowerCase(),d=$('#issue-department-filter').val();filteredIssues=allIssues.filter(i=>{const sm=!s||i.name.toLowerCase().includes(s)||i.id.toLowerCase().includes(s);const dm=!d||i.department===d;return sm&&dm;});renderIssues(filteredIssues);}
function filterIssuesByDepartment(){searchIssues();}
function showNewIssueModal(){
    google.script.run.withSuccessHandler(r=>{if(r&&r.success){const s=$('#newIssueDeptSelect');s.empty().append('<option value="">Select Department</option>');r.data.forEach(d=>s.append(`<option value="${d.name}">${d.name}</option>`));}}).getDepartmentList();
    google.script.run.withSuccessHandler(r=>{if(r&&r.success){const s=$('#newIssueAssigneeSelect');s.empty().append('<option value="">Select Assignee</option>');r.data.forEach(u=>s.append(`<option value="${u.id}">${u.name} (${u.department||'No Dept'})</option>`));}}).getAllActiveUsers();
    new bootstrap.Modal(document.getElementById('newIssueModal')).show();
}
function createNewIssue(){
    const form=$('#newIssueForm');const fd={};form.serializeArray().forEach(i=>{fd[i.name]=i.value;});
    if(!fd.name||!fd.department||!fd.severity){showAwesomeAlert('Missing Fields','Please fill all required fields (*).','warning');return;}
    google.script.run.withSuccessHandler(r=>{if(r.success){showAwesomeAlert('Success','Issue created!','success');$('#newIssueModal').modal('hide');form[0].reset();loadIssues();loadDashboardData();}else{showAwesomeAlert('Error',r.message,'error');}}).createIssue(fd,currentUser.id);
}
function editIssue(iid){
    const issue=allIssues.find(i=>i.id===iid);
    if(issue){
        $('#edit-issue-id').val(iid);$('#edit-issue-status').val(issue.status);$('#edit-issue-severity').val(issue.severity);$('#edit-issue-classification').val(issue.classification||'Bug');$('#edit-issue-flag').val(issue.flag||'Normal');$('#edit-issue-completion').val(issue.manualProgress||0);$('#issue-completion-value').text((issue.manualProgress||0)+'%');
        google.script.run.withSuccessHandler(r=>{if(r&&r.success){const s=$('#edit-issue-assignee');s.empty().append('<option value="">Select Assignee</option>');r.data.forEach(u=>s.append(`<option value="${u.id}" ${u.id===issue.assignee?'selected':''}>${u.name} (${u.department||'No Dept'})</option>`));}}).getAllActiveUsers();
        $('#edit-issue-completion').off('input').on('input',function(){$('#issue-completion-value').text(this.value+'%');});
        new bootstrap.Modal(document.getElementById('editIssueModal')).show();
    }
}
function updateIssueDetails(){
    const iid=$('#edit-issue-id').val();
    const upd={status:$('#edit-issue-status').val(),severity:$('#edit-issue-severity').val(),assignee:$('#edit-issue-assignee').val(),classification:$('#edit-issue-classification').val(),flag:$('#edit-issue-flag').val(),completion:parseInt($('#edit-issue-completion').val())};
    google.script.run.withSuccessHandler(r=>{if(r.success){showAwesomeAlert('Success','Issue updated!','success');$('#editIssueModal').modal('hide');loadIssues();loadDashboardData();}else{showAwesomeAlert('Error',r.message,'error');}}).updateIssue(iid,upd);
}
function viewIssue(iid){const issue=allIssues.find(i=>i.id===iid);if(issue){showAwesomeAlert('Issue: '+issue.id,`${issue.name} — Status: ${issue.status} | Severity: ${issue.severity}`,'info');}}

// ==================== DEPENDENCIES ====================
function loadDependencies(){google.script.run.withSuccessHandler(r=>{if(r&&r.success){allDependencies=r.data;filteredDependencies=[...allDependencies];renderDependencies(filteredDependencies);}}).getDependencies();}
function renderDependencies(deps){
    const tbody=$('#dependencies-body');tbody.empty();
    if(!deps.length){tbody.append('<tr><td colspan="8" class="text-center text-muted py-4">No dependencies found</td></tr>');return;}
    deps.forEach(d=>{tbody.append(`<tr><td><strong>${d.id}</strong></td><td>${d.taskId}</td><td>${d.dependsOn}</td><td>${d.type}</td><td>${d.status}</td><td>${formatDate(d.createdDate)}</td><td>${d.notes||'-'}</td><td><div class="action-buttons"><button class="action-btn" onclick="editDependency('${d.id}')" title="Edit"><i class="bi bi-pencil"></i></button><button class="action-btn" onclick="deleteItem('${d.id}','dependency')" ${currentUser.role!=='Admin'?'disabled':''} title="Delete"><i class="bi bi-trash"></i></button></div></td></tr>`);});
}
function searchDependencies(){const s=$('#dependency-search').val().toLowerCase();filteredDependencies=!s?[...allDependencies]:allDependencies.filter(d=>d.taskId.toLowerCase().includes(s)||d.dependsOn.toLowerCase().includes(s)||d.id.toLowerCase().includes(s));renderDependencies(filteredDependencies);}
function showNewDependencyModal(){
    google.script.run.withSuccessHandler(r=>{if(r&&r.success){const o='<option value="">Select Task</option>'+r.data.map(t=>`<option value="${t.id}">${t.id} - ${t.name}</option>`).join('');$('#newDepTaskSelect').html(o);$('#newDepDependsOnSelect').html(o);}}).getTasks('All Task',currentUser.id,currentUser.role);
    new bootstrap.Modal(document.getElementById('newDependencyModal')).show();
}
function createNewDependency(){
    const form=$('#newDependencyForm');const fd={};form.serializeArray().forEach(i=>{fd[i.name]=i.value;});
    if(!fd.taskId||!fd.dependsOn){showAwesomeAlert('Missing Data','Please select both tasks.','warning');return;}
    if(fd.taskId===fd.dependsOn){showAwesomeAlert('Invalid','A task cannot depend on itself.','warning');return;}
    google.script.run.withSuccessHandler(r=>{if(r.success){showAwesomeAlert('Success','Dependency created!','success');$('#newDependencyModal').modal('hide');form[0].reset();loadDependencies();}else{showAwesomeAlert('Error',r.message,'error');}}).createDependency(fd);
}
function editDependency(did){const dep=allDependencies.find(d=>d.id===did);if(dep){$('#edit-dependency-id').val(did);$('#edit-dependency-status').val(dep.status);new bootstrap.Modal(document.getElementById('editDependencyModal')).show();}}
function updateDependencyDetails(){const did=$('#edit-dependency-id').val();google.script.run.withSuccessHandler(r=>{if(r.success){showAwesomeAlert('Success','Dependency updated!','success');$('#editDependencyModal').modal('hide');loadDependencies();}else{showAwesomeAlert('Error',r.message,'error');}}).updateDependency(did,{status:$('#edit-dependency-status').val()});}

// ==================== USERS ====================
function loadUsers(){
    google.script.run.withSuccessHandler(r=>{
        if(r&&r.success){allUsers=r.data;filteredUsers=[...allUsers];renderUsers(filteredUsers);populateDepartmentFilter(allUsers,'user-department-filter');currentUser.role!=='Admin'?$('#new-user-btn').hide():$('#new-user-btn').show();}
    }).getUsers(currentUser.role,currentUser.id);
}
function renderUsers(users){
    const tbody=$('#users-body');tbody.empty();
    if(!users.length){tbody.append('<tr><td colspan="9" class="text-center text-muted py-4">No users found</td></tr>');return;}
    users.forEach(u=>{const rc=getRoleClass(u.role),si=u.status==='Active'?'<i class="bi bi-circle-fill text-success me-1"></i>':'<i class="bi bi-circle-fill text-danger me-1"></i>';tbody.append(`<tr><td><strong>${u.id}</strong></td><td>${u.username}</td><td>${u.fullName}</td><td>${u.email}</td><td><span class="role-badge ${rc}">${u.role}</span></td><td>${u.department||'-'}</td><td>${si}${u.status}</td><td>${u.contactNumber||'-'}</td><td><div class="action-buttons"><button class="action-btn" onclick="deleteItem('${u.id}','user')" ${currentUser.role!=='Admin'?'disabled':''} title="Delete"><i class="bi bi-trash"></i></button></div></td></tr>`);});
}
function searchUsers(){const s=$('#user-search').val().toLowerCase();filteredUsers=!s?[...allUsers]:allUsers.filter(u=>u.username.toLowerCase().includes(s)||u.fullName.toLowerCase().includes(s));renderUsers(filteredUsers);}
function filterUsersByRole(){const r=$('#user-role-filter').val(),d=$('#user-department-filter').val();filteredUsers=allUsers.filter(u=>(!r||u.role===r)&&(!d||u.department===d));renderUsers(filteredUsers);}
function filterUsersByDepartment(){filterUsersByRole();}
function showNewUserModal(){
    if(currentUser.role!=='Admin'){showAwesomeAlert('Access Denied','Only administrators can create users.','warning');return;}
    google.script.run.withSuccessHandler(function(r){if(r&&r.success){const s=$('#newUserDeptSelect');s.empty().append('<option value="">Select Department</option>');r.data.forEach(function(d){s.append(`<option value="${d.name}">${d.name}</option>`);});}}).getDepartmentList();
    google.script.run.withSuccessHandler(function(r){if(r&&r.success){const s=$('#newUserManagerSelect');s.empty().append('<option value="">Select Manager</option>');r.data.forEach(function(m){s.append(`<option value="${m.id}">${m.name} (${m.role})</option>`);});}}).getManagers();
    $('#newUserForm')[0].reset();$('#manager-field').hide();
    new bootstrap.Modal(document.getElementById('newUserModal')).show();
    $('#newUserRoleSelect').off('change').on('change',function(){this.value==='User'?$('#manager-field').show():$('#manager-field').hide();});
}
function createNewUser(){
    if(currentUser.role!=='Admin'){showAwesomeAlert('Access Denied','Only administrators can create users.','warning');return;}
    const form=$('#newUserForm');const fd={};form.serializeArray().forEach(i=>{fd[i.name]=i.value;});
    if(!fd.username||!fd.password||!fd.fullName||!fd.email||!fd.role||!fd.department){showAwesomeAlert('Missing Fields','Please fill all required fields (*).','warning');return;}
    google.script.run.withSuccessHandler(r=>{if(r.success){showAwesomeAlert('Success','User created!','success');$('#newUserModal').modal('hide');form[0].reset();loadUsers();}else{showAwesomeAlert('Error',r.message,'error');}}).createUser(fd,currentUser.id);
}

// ==================== DEPARTMENTS ====================
function loadDepartments(){const filter=$('#department-filter').val();google.script.run.withSuccessHandler(r=>{if(r&&r.success){allDepartments=r.data;renderDepartments(allDepartments);}}).getDepartments(filter,currentUser.id);}
function renderDepartments(depts){
    const tbody=$('#departments-body');tbody.empty();
    if(!depts.length){tbody.append('<tr><td colspan="8" class="text-center text-muted py-4">No departments found</td></tr>');return;}
    depts.forEach(d=>{tbody.append(`<tr><td>${d.id}</td><td>${d.name}</td><td>${d.description||'-'}</td><td>${d.owner||'-'}</td><td>${d.status}</td><td>${d.totalTasks}</td><td>${d.openTasks}</td><td><button class="btn btn-sm btn-outline-danger" onclick="deleteItem('${d.id}','department')"><i class="bi bi-trash"></i></button></td></tr>`);});
}
function searchDepartments(){const s=$('#department-search').val().toLowerCase();renderDepartments(!s?allDepartments:allDepartments.filter(d=>d.name.toLowerCase().includes(s)));}
function showNewDepartmentModal(){google.script.run.withSuccessHandler(r=>{const s=$('#newDepartmentOwnerSelect');s.empty().append('<option value="">Select Owner</option>');r.data.forEach(u=>s.append(`<option value="${u.id}">${u.name}</option>`));}).getAllActiveUsers();new bootstrap.Modal(document.getElementById('newDepartmentModal')).show();}
function createNewDepartment(){
    const form=$('#newDepartmentForm');const fd={};form.serializeArray().forEach(i=>{fd[i.name]=i.value;});
    if(!fd.name){showAwesomeAlert('Missing Name','Please enter department name.','warning');return;}
    google.script.run.withSuccessHandler(r=>{if(r.success){showAwesomeAlert('Success','Department created!','success');$('#newDepartmentModal').modal('hide');form[0].reset();loadDepartments();}else{showAwesomeAlert('Error',r.message,'error');}}).createDepartment(fd,currentUser.id);
}

// ==================== DELETE ====================
function deleteItem(itemId,itemType){
    if((itemType==='user'||itemType==='department')&&currentUser.role!=='Admin'){showAwesomeAlert('Access Denied','Only administrators can delete this.','warning');return;}
    $('#delete-item-id').val(itemId);$('#delete-item-type').val(itemType);$('#delete-item-name').text(itemType);
    new bootstrap.Modal(document.getElementById('deleteConfirmModal')).show();
}
function confirmDelete(){
    const itemId=$('#delete-item-id').val(),itemType=$('#delete-item-type').val();
    $('#deleteConfirmModal').modal('hide');
    let fn;
    switch(itemType){
        case 'task':         fn=google.script.run.deleteTask; break;
        case 'issue':        fn=google.script.run.deleteIssue; break;
        case 'user':         fn=google.script.run.deleteUser; break;
        case 'department':   fn=google.script.run.deleteDepartment; break;
        case 'dependency':   fn=google.script.run.deleteDependency; break;
        case 'notification': fn=google.script.run.deleteNotification; break;
        default: return;
    }
    fn.withSuccessHandler(r=>{
        if(r.success){
            showAwesomeAlert('Deleted',`${itemType.charAt(0).toUpperCase()+itemType.slice(1)} deleted!`,'success');
            const at = $('.nav-tabs-custom .nav-link.active').attr('data-bs-target');
            switch(at){case '#dashboard':loadDashboardData();break;case '#user':loadUsers();break;case '#department':loadDepartments();break;case '#task':loadTasks();break;case '#issue':loadIssues();break;case '#dependency':loadDependencies();break;case '#report':loadReport();break;case '#notification':loadNotifications();break;}
        }else{showAwesomeAlert('Error','Error: '+r.message,'error');}
    }).withFailureHandler(err=>{showAwesomeAlert('Error','Error: '+err.message,'error');})(itemId);
}

// ==================== REPORT ====================
function loadReport(){
    $('#report-body').html('<tr><td colspan="18" class="text-center py-5"><div class="spinner-border spinner-border-sm text-primary"></div><span class="ms-2">Loading...</span></td></tr>');
    google.script.run
        .withSuccessHandler(function(r){ if(r&&r.success){allReportTasks=Array.isArray(r.data)?r.data:[];populateReportFilterDropdowns();applyReportFilters();}})
        .getTasks('All Task',currentUser.id,currentUser.role);
}
function populateReportFilterDropdowns(){
    const depts=[...new Set(allReportTasks.map(t=>t.department).filter(Boolean))].sort();
    const ds=$('#report-dept-filter'),pv=ds.val();ds.empty().append('<option value="">All Departments</option>');depts.forEach(d=>ds.append(`<option value="${d}">${d}</option>`));ds.val(pv);
    const grps=[...new Set(allReportTasks.map(t=>t.group).filter(Boolean))].sort();
    const gs=$('#report-group-filter'),gv=gs.val();gs.empty().append('<option value="">All Groups</option>');grps.forEach(g=>gs.append(`<option value="${g}">${g}</option>`));gs.val(gv);
}
function applyReportFilters(){
    const status=$('#report-status-filter').val(),priority=$('#report-priority-filter').val(),dept=$('#report-dept-filter').val(),group=$('#report-group-filter').val(),type=$('#report-type-filter').val(),search=$('#report-search').val().toLowerCase(),dateFrom=$('#report-date-from').val(),dateTo=$('#report-date-to').val();
    filteredReportTasks=allReportTasks.filter(task=>{
        if(status&&task.status!==status)return false;if(priority&&task.priority!==priority)return false;if(dept&&task.department!==dept)return false;if(group&&task.group!==group)return false;
        if(type==='parent'&&task.parentTaskId)return false;if(type==='subtask'&&!task.parentTaskId)return false;
        if(search&&!(task.id.toLowerCase().includes(search)||task.name.toLowerCase().includes(search)||(task.description||'').toLowerCase().includes(search)||(task.owner||'').toLowerCase().includes(search)||(task.tags||'').toLowerCase().includes(search)))return false;
        if(dateFrom&&task.dueDate&&task.dueDate.slice(0,10)<dateFrom)return false;if(dateTo&&task.dueDate&&task.dueDate.slice(0,10)>dateTo)return false;
        return true;
    });
    sortReportData();updateReportSummary();renderReport(filteredReportTasks);
}
function clearReportFilters(){$('#report-status-filter,#report-priority-filter,#report-dept-filter,#report-group-filter,#report-type-filter').val('');$('#report-search').val('');$('#report-date-from,#report-date-to').val('');applyReportFilters();}
function sortReport(key){reportSortKey===key?reportSortAsc=!reportSortAsc:(reportSortKey=key,reportSortAsc=true);sortReportData();renderReport(filteredReportTasks);}
function sortReportData(){filteredReportTasks.sort((a,b)=>{let va=a[reportSortKey]||'',vb=b[reportSortKey]||'';if(reportSortKey==='completion'){va=Number(va);vb=Number(vb);}else if(['startDate','dueDate','createdDate'].includes(reportSortKey)){va=va?new Date(va).getTime():0;vb=vb?new Date(vb).getTime():0;}else{va=String(va).toLowerCase();vb=String(vb).toLowerCase();}if(va<vb)return reportSortAsc?-1:1;if(va>vb)return reportSortAsc?1:-1;return 0;});}
function updateReportSummary(){
    const tasks=filteredReportTasks,now=new Date();
    const total=tasks.length,open=tasks.filter(t=>t.status.toLowerCase()!=='closed').length,closed=tasks.filter(t=>t.status.toLowerCase()==='closed').length,high=tasks.filter(t=>(t.priority||'').toLowerCase()==='high').length,overdue=tasks.filter(t=>{if(!t.dueDate||t.status.toLowerCase()==='closed')return false;return new Date(t.dueDate)<now;}).length,avg=total>0?Math.round(tasks.reduce((s,t)=>s+(Number(t.completion)||0),0)/total):0;
    $('#rpt-total').text(total);$('#rpt-open').text(open);$('#rpt-closed').text(closed);$('#rpt-high').text(high);$('#rpt-overdue').text(overdue);$('#rpt-avg').text(avg+'%');
    $('#report-record-count').text(`Showing ${total} record${total!==1?'s':''}`);
}
function renderReport(tasks){
    const tbody=$('#report-body');tbody.empty();
    if(!tasks.length){tbody.append(`<tr><td colspan="18" class="text-center text-muted py-5"><i class="bi bi-inbox" style="font-size:2.5rem;opacity:0.3;"></i><div class="mt-2">No records match your filters</div></td></tr>`);return;}
    const now=new Date();
    tasks.forEach(task=>{
        const isSub=!!task.parentTaskId;
        const typeBadge=isSub?'<span style="background:#7f8c8d;color:white;font-size:0.72em;padding:2px 8px;border-radius:10px;">Subtask</span>':'<span style="background:#2c3e50;color:white;font-size:0.72em;padding:2px 8px;border-radius:10px;">Task</span>';
        let dlHtml='-';
        if(task.dueDate){const due=new Date(task.dueDate),d=Math.ceil((due-now)/(1000*60*60*24));if(d<0){dlHtml=`<span style="color:#dc3545;font-weight:700;">${Math.abs(d)}d overdue</span>`;}else if(d<=3){dlHtml=`<span style="color:#e67e22;font-weight:700;">${d}d left</span>`;}else{dlHtml=`<span>${d}d</span>`;}}
        const mp=Number(task.completion)||0,ap=Number(task.autoProgress)||0,ac=getHeatmapColor(ap),atc=(ac==='#ffc107')?'#664d03':ac;
        const mBar=`<div style="min-width:80px;"><div style="display:flex;align-items:center;gap:4px;"><div style="flex:1;height:6px;background:#e9ecef;border-radius:4px;overflow:hidden;"><div style="width:${mp}%;height:100%;background:#0d6efd;border-radius:4px;"></div></div><span style="font-size:10px;font-weight:700;color:#0d6efd;min-width:28px;">${mp}%</span></div></div>`;
        const aBar=`<div style="min-width:80px;"><div style="display:flex;align-items:center;gap:4px;"><div style="flex:1;height:6px;background:#e9ecef;border-radius:4px;overflow:hidden;"><div style="width:${ap}%;height:100%;background:${ac};border-radius:4px;"></div></div><span style="font-size:10px;font-weight:700;color:${atc};min-width:28px;">${ap}%</span></div></div>`;
        const dep=task.dependency==='Yes'?'<span class="badge bg-info text-dark">Yes</span>':'<span class="text-muted">No</span>';
        tbody.append(`<tr style="${isSub?'background-color:#f9f9f9;':''}"><td><strong style="font-family:monospace;font-size:0.85em;">${task.id}</strong></td><td>${typeBadge}</td><td style="max-width:160px;white-space:normal;">${isSub?'<i class="bi bi-arrow-return-right text-muted me-1"></i>':''}${task.name}</td><td style="max-width:180px;white-space:normal;color:#555;">${task.description||'-'}</td><td>${task.department||'-'}</td><td>${task.owner||'-'}</td><td><small>${task.tags||'-'}</small></td><td><span class="status-badge ${getStatusClass(task.status)}">${task.status}</span></td><td><span class="priority-badge ${getPriorityClass(task.priority)}">${task.priority||'None'}</span></td><td><small>${task.group||'-'}</small></td><td style="white-space:nowrap;"><small>${formatDate(task.startDate)}</small></td><td style="white-space:nowrap;"><small>${formatDate(task.dueDate)}</small></td><td style="white-space:nowrap;">${dlHtml}</td><td>${mBar}</td><td>${aBar}</td><td><small style="font-family:monospace;">${task.parentTaskId||'-'}</small></td><td>${dep}</td><td style="white-space:nowrap;"><small>${formatDate(task.createdDate)}</small></td></tr>`);
    });
}
function downloadReportCSV(){
    if(!filteredReportTasks.length){showAwesomeAlert('No Data','No records to export.','warning');return;}
    const headers=['Task ID','Type','Task Name','Description','Department','Owner','Doer (Tags)','Status','Priority','Group','Start Date','Due Date','Days Left','Manual %','Auto %','Parent Task ID','Dependency','Created Date'];
    const now=new Date();
    const rows=filteredReportTasks.map(task=>{
        const isSub=!!task.parentTaskId;let dl='';
        if(task.dueDate){const due=new Date(task.dueDate),d=Math.ceil((due-now)/(1000*60*60*24));dl=d<0?`${Math.abs(d)} days overdue`:`${d} days`;}
        return[task.id,isSub?'Subtask':'Task',task.name,task.description||'',task.department||'',task.owner||'',task.tags||'',task.status,task.priority||'None',task.group||'',formatDate(task.startDate),formatDate(task.dueDate),dl,(task.completion||0)+'%',(task.autoProgress||0)+'%',task.parentTaskId||'',task.dependency||'No',formatDate(task.createdDate)];
    });
    const csv=[headers,...rows].map(r=>r.map(c=>{const v=String(c).replace(/"/g,'""');return v.includes(',')||v.includes('"')||v.includes('\n')?`"${v}"`:v;}).join(',')).join('\r\n');
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`Task_Report_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
    showAwesomeAlert('Downloaded',`${filteredReportTasks.length} records exported!`,'success');
}

// ==================== NOTIFICATIONS ====================
function loadNotifications() {
    const tbody = $('#notifications-body');
    tbody.html(`<tr><td colspan="10" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div><span class="ms-2">Loading…</span></td></tr>`);

    google.script.run.withSuccessHandler(function(r) {
        if (!r || !r.success) return;
        const s = r.data;
        $('#setting-email-enabled').prop('checked',       s['email_enabled']            === 'true');
        $('#setting-auto-task-create').prop('checked',    s['auto_notify_task_create']  === 'true');
        $('#setting-auto-task-assign').prop('checked',    s['auto_notify_task_assign']  === 'true');
        $('#setting-auto-issue-assign').prop('checked',   s['auto_notify_issue_assign'] === 'true');
        if (currentUser.role === 'User') {
            $('#setting-email-enabled,#setting-auto-task-create,#setting-auto-task-assign,#setting-auto-issue-assign').prop('disabled', true);
            $('#save-settings-btn').prop('disabled', true).text('Admin / Manager Only');
        }
    }).getSettings();

    google.script.run
        .withSuccessHandler(function(r) {
            if (r && r.success) {
                allNotifications = r.data || [];
                filteredNotifications = [...allNotifications];
                renderNotifications(filteredNotifications);
                const cnt = allNotifications.length;
                cnt > 0 ? $('#notif-badge').text(cnt > 99 ? '99+' : cnt).removeClass('d-none') : $('#notif-badge').addClass('d-none');
            } else {
                tbody.html(`<tr><td colspan="10" class="text-center text-danger py-4">${r ? r.message : 'Error'}</td></tr>`);
            }
        })
        .withFailureHandler(function(err) { tbody.html(`<tr><td colspan="10" class="text-center text-danger py-4">Failed: ${err.message}</td></tr>`); })
        .getNotifications(currentUser.id, currentUser.role);

    google.script.run.withSuccessHandler(function(r) { if (r && r.success) { notifTasksList = r.data || []; updateManualTargetList(); } }).getTasks('All Task', currentUser.id, currentUser.role);
    google.script.run.withSuccessHandler(function(r) { if (r && r.success) notifIssuesList = r.data || []; }).getIssues('All Issue', currentUser.id, currentUser.role);

    currentUser.role === 'Admin' ? $('#clear-notif-btn').removeClass('d-none') : $('#clear-notif-btn').addClass('d-none');
}

function saveNotifSettings() {
    if (currentUser.role === 'User') { showAwesomeAlert('Access Denied', 'Only Admin or Manager can change settings.', 'warning'); return; }
    const settings = {
        email_enabled:            $('#setting-email-enabled').is(':checked')    ? 'true' : 'false',
        auto_notify_task_create:  $('#setting-auto-task-create').is(':checked') ? 'true' : 'false',
        auto_notify_task_assign:  $('#setting-auto-task-assign').is(':checked') ? 'true' : 'false',
        auto_notify_issue_assign: $('#setting-auto-issue-assign').is(':checked')? 'true' : 'false'
    };
    const btn = $('#save-settings-btn');
    btn.html('<span class="spinner-border spinner-border-sm me-1"></span>Saving…').prop('disabled', true);
    google.script.run
        .withSuccessHandler(function(r) { btn.html('<i class="bi bi-save me-1"></i> Save Settings').prop('disabled', false); r.success ? showAwesomeAlert('Saved', 'Settings updated!', 'success') : showAwesomeAlert('Error', r.message, 'error'); })
        .withFailureHandler(function(err) { btn.html('<i class="bi bi-save me-1"></i> Save Settings').prop('disabled', false); showAwesomeAlert('Error', err.message, 'error'); })
        .saveSettings(settings);
}

function updateManualTargetList() {
    const type = $('#manual-notif-type').val(), sel = $('#manual-notif-target');
    sel.empty().append(`<option value="">Select ${type === 'task' ? 'task' : 'issue'}…</option>`);
    const list = type === 'task' ? notifTasksList : notifIssuesList;
    list.forEach(function(item) { sel.append(`<option value="${item.id}">${item.id} — ${item.name} (${item.status})</option>`); });
}

function sendManualNotification() {
    const type = $('#manual-notif-type').val(), targetId = $('#manual-notif-target').val();
    if (!targetId) { showAwesomeAlert('No Target', 'Please select a task or issue.', 'warning'); return; }
    const btn = document.getElementById('send-notif-btn'), origHtml = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Sending…'; btn.disabled = true;
    function onSuccess(r) {
        btn.innerHTML = origHtml; btn.disabled = false;
        if (r && r.success) { showAwesomeAlert('Sent', 'Email: ' + (r.emailResult || 'N/A'), 'success'); loadNotifications(); }
        else { showAwesomeAlert('Error', r ? r.message : 'Unknown error', 'error'); }
    }
    function onFailure(err) { btn.innerHTML = origHtml; btn.disabled = false; showAwesomeAlert('Error', err.message, 'error'); }
    const runner = google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFailure);
    if (type === 'task') runner.triggerTaskNotification(targetId, currentUser.id);
    else                 runner.triggerIssueNotification(targetId, currentUser.id);
}

function renderNotifications(notifs) {
    const tbody = $('#notifications-body');
    tbody.empty();
    $('#notif-record-count').text(`${notifs.length} record${notifs.length !== 1 ? 's' : ''}`);
    if (!notifs.length) { tbody.html(`<tr><td colspan="10" class="text-center text-muted py-5"><i class="bi bi-bell-slash" style="font-size:2.5rem;opacity:0.3;"></i><div class="mt-2">No notifications found</div></td></tr>`); return; }
    notifs.forEach(function(n) {
        let statusBadge;
        if (n.status === 'Sent') statusBadge = '<span class="badge bg-success">Sent</span>';
        else if (n.status.startsWith('Failed')) statusBadge = `<span class="badge bg-danger">Failed</span>`;
        else statusBadge = `<span class="badge bg-warning text-dark">${n.status}</span>`;
        const typeColor = n.type.includes('Issue') ? '#e67e22' : '#2980b9';
        tbody.append(`<tr>
          <td><strong style="font-family:monospace;font-size:.85em;">${n.id}</strong></td>
          <td><strong class="text-primary" style="font-family:monospace;font-size:.85em;">${n.referenceId||'—'}</strong></td>
          <td><span class="badge" style="background:${typeColor};font-size:.7em;">${n.type}</span></td>
          <td><div class="fw-semibold" style="font-size:.88em;">${n.recipientName||n.recipientId||'—'}</div><div class="text-muted" style="font-size:.75em;">${n.recipientId}</div></td>
          <td style="font-size:.8em;">${n.recipientEmail||'—'}</td>
          <td>${statusBadge}</td>
          <td style="max-width:200px;white-space:normal;font-size:.82em;">${n.message||'—'}</td>
          <td style="white-space:nowrap;font-size:.82em;">${formatDate(n.sentDate)}</td>
          <td style="font-size:.82em;">${n.triggeredBy||'—'}</td>
          <td><button class="action-btn" onclick="deleteNotifItem('${n.id}')" title="Delete"><i class="bi bi-trash"></i></button></td>
        </tr>`);
    });
}

function filterNotifications() {
    const status = $('#notif-status-filter').val(), type = $('#notif-type-filter').val(), search = $('#notif-search').val().toLowerCase();
    filteredNotifications = allNotifications.filter(function(n) {
        if (status && !n.status.includes(status)) return false;
        if (type   && n.type !== type) return false;
        if (search && ![n.id, n.referenceId, n.recipientName, n.recipientId, n.message, n.triggeredBy].join(' ').toLowerCase().includes(search)) return false;
        return true;
    });
    renderNotifications(filteredNotifications);
}

function deleteNotifItem(notifId) { google.script.run.withSuccessHandler(function(r) { r.success ? loadNotifications() : showAwesomeAlert('Error', r.message, 'error'); }).deleteNotification(notifId); }
function clearNotifLog() { if (currentUser.role !== 'Admin') return; google.script.run.withSuccessHandler(function(r) { if (r.success) { showAwesomeAlert('Cleared', 'All notifications cleared.', 'success'); loadNotifications(); } }).clearAllNotifications(currentUser.id, currentUser.role); }

// ==================== UTILITIES ====================
function formatDate(ds){if(!ds)return'-';try{const d=new Date(ds);if(isNaN(d.getTime()))return'-';return d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});}catch(e){return'-';}}
function getHeatmapColor(p){if(p<=25)return'#dc3545';if(p<=50)return'#ffc107';if(p<=75)return'#fd7e14';if(p<=90)return'#90ee90';return'#198754';}
function getStatusClass(s){if(!s)return'status-open';const l=s.toLowerCase();if(l.includes('progress'))return'status-in-progress';if(l.includes('review'))return'status-in-review';if(l.includes('test'))return'status-to-be-tested';if(l.includes('closed'))return'status-closed';return'status-open';}
function getPriorityClass(p){if(!p)return'priority-none';const l=p.toLowerCase();if(l.includes('high'))return'priority-high';if(l.includes('low'))return'priority-low';if(l.includes('medium'))return'priority-medium';return'priority-none';}
function getRoleClass(r){if(!r)return'role-user';const l=r.toLowerCase();if(l.includes('admin'))return'role-admin';if(l.includes('manager'))return'role-manager';return'role-user';}
function populateDepartmentFilter(users,id){const depts=[...new Set(users.map(u=>u.department).filter(Boolean))];const s=$(`#${id}`);s.empty().append('<option value="">All Departments</option>');depts.forEach(d=>s.append(`<option value="${d}">${d}</option>`));}
function populateDepartmentFilterFromGroups(groups,id){const s=$(`#${id}`);s.empty().append('<option value="">All Departments</option>');groups.forEach(g=>s.append(`<option value="${g}">${g}</option>`));}
function populateGroupFilter(groups,id){const s=$(`#${id}`);s.empty().append('<option value="">All Groups</option>');groups.forEach(g=>s.append(`<option value="${g}">${g}</option>`));}
function loadOpenTasks(){const t=document.querySelector('#task-tab');if(t){new bootstrap.Tab(t).show();setTimeout(()=>$('#task-filter').val('Open Task').trigger('change'),300);}}
function loadClosedTasks(){const t=document.querySelector('#task-tab');if(t){new bootstrap.Tab(t).show();setTimeout(()=>$('#task-filter').val('Complete Task').trigger('change'),300);}}
function loadOpenIssues(){const t=document.querySelector('#issue-tab');if(t){new bootstrap.Tab(t).show();setTimeout(()=>$('#issue-filter').val('Open Issue').trigger('change'),300);}}
function loadClosedIssues(){const t=document.querySelector('#issue-tab');if(t){new bootstrap.Tab(t).show();setTimeout(()=>$('#issue-filter').val('Closed Issue').trigger('change'),300);}}
function loadAllTasks(){const t=document.querySelector('#task-tab');if(t)new bootstrap.Tab(t).show();}
function loadAllIssues(){const t=document.querySelector('#issue-tab');if(t)new bootstrap.Tab(t).show();}
