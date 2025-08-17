// This is the complete, corrected script for the Project & Task Manager application.
// It is synchronized with the latest HTML structure, including all modals and the context-aware floating action button.

document.addEventListener('DOMContentLoaded', async () => {

    // --- AUTHENTICATION CHECK ---
    // Ensures a user is logged in before loading the app.
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    const user = session.user;

    // --- DOM ELEMENT SELECTORS ---
    // It's critical that these IDs match the HTML file exactly.
    const appContent = document.getElementById('app-content');
    const notificationContainer = document.getElementById('notification-container');
    
    // Views
    const projectsView = document.getElementById('view-projects');
    const tasksView = document.getElementById('view-tasks');
    const singleProjectView = document.getElementById('view-single-project');
    
    // Header & Navigation
    const tabBtnProjects = document.getElementById('tab-btn-projects');
    const tabBtnTasks = document.getElementById('tab-btn-tasks');
    const backToProjectsBtn = document.getElementById('back-to-projects-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Main Content Lists
    const projectList = document.getElementById('project-list');
    const taskList = document.getElementById('task-list');
    const singleProjectTaskList = document.getElementById('single-project-task-list');
    const notesListContainer = document.getElementById('project-notes-list');

    // Forms
    const addProjectForm = document.getElementById('add-project-form');
    const addTaskForm = document.getElementById('add-task-form');
    const editProjectForm = document.getElementById('edit-project-form');
    const editTaskForm = document.getElementById('edit-task-form');
    const addNoteForm = document.getElementById('add-note-form');

    // Modals & Controls
    const fabAddButton = document.getElementById('fab-add-button');
    const addProjectModal = document.getElementById('add-project-modal');
    const cancelAddProjectBtn = document.getElementById('cancel-add-project-btn');
    const addTaskModal = document.getElementById('add-task-modal');
    const cancelAddTaskBtn = document.getElementById('cancel-add-task-btn');
    const editProjectModal = document.getElementById('edit-project-modal');
    const cancelEditProjectBtn = document.getElementById('cancel-edit-project-btn');
    const deleteProjectBtn = document.getElementById('delete-project-btn');
    const editTaskModal = document.getElementById('edit-task-modal');
    const cancelEditTaskBtn = document.getElementById('cancel-edit-task-btn');
    const confirmationModal = document.getElementById('confirmation-modal');
    const confirmationTitle = document.getElementById('confirmation-title');
    const confirmationMessage = document.getElementById('confirmation-message');
    const cancelConfirmationBtn = document.getElementById('cancel-confirmation-btn');
    const confirmActionBtn = document.getElementById('confirm-action-btn');

    // Filters & Dropdowns
    const taskProjectSelect = document.getElementById('task-project-select');
    const filterProject = document.getElementById('filter-project');
    const filterPriority = document.getElementById('filter-priority');
    const filterDate = document.getElementById('filter-date');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const filterProjectStatus = document.getElementById('filter-project-status');
    const filterProjectTasksDue = document.getElementById('filter-project-tasks-due');
    const clearProjectFiltersBtn = document.getElementById('clear-project-filters-btn');

    // "Empty State" Messages
    const noProjectsMessage = document.getElementById('no-projects-message');
    const noTasksMessage = document.getElementById('no-tasks-message');
    const singleProjectNoTasksMessage = document.getElementById('single-project-no-tasks-message');
    
    // Single Project Detail Fields
    const singleProjectHeader = document.getElementById('single-project-header');
    const projectTypeDetail = document.getElementById('project-type-detail');
    const projectCategoryDetail = document.getElementById('project-category-detail');
    const servicesRequiredDetail = document.getElementById('services-required-detail');
    const projectAreaDetail = document.getElementById('project-area-detail');
    const possessionDateDetail = document.getElementById('possession-date-detail');
    const initialNoteDetail = document.getElementById('initial-note-detail');
    const projectFilesList = document.getElementById('project-files-list');

    // --- UI FEEDBACK HELPERS ---
    const startButtonLoading = (button) => {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<span class="spinner"></span>';
    };
    const stopButtonLoading = (button) => {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    };
    const showNotification = (message, isError = false) => {
        notificationContainer.textContent = message;
        notificationContainer.className = `glass-container fixed top-5 right-5 z-[101] text-white px-6 py-3 transition-transform transform ${isError ? 'bg-red-500/30' : 'bg-green-500/30'}`;
        notificationContainer.classList.remove('translate-x-[calc(100%+2rem)]');
        setTimeout(() => {
            notificationContainer.classList.add('translate-x-[calc(100%+2rem)]');
        }, 3000);
    };

    // --- STATE MANAGER (Data Handling) ---
    const stateManager = {
        projects: [],
        tasks: [],
        currentProjectId: null,
        taskFilters: { project: 'all', priority: 'all', dateRange: 'all' },
        projectFilters: { status: 'all', tasksDue: 'all' },

        async loadData() {
            try {
                const { data: projects, error: projectsError } = await _supabase.from('projects').select('*').or(`user_id.eq.${user.id},user_id.is.null`);
                if (projectsError) throw projectsError;
                this.projects = projects || [];

                const { data: tasks, error: tasksError } = await _supabase.from('tasks').select('*').eq('user_id', user.id);
                if (tasksError) throw tasksError;
                this.tasks = tasks || [];
            } catch (error) {
                showNotification('Error loading data: ' + error.message, true);
                console.error('Data loading error:', error);
            }
        },
        async addProject(projectData) {
            const { data, error } = await _supabase.from('projects').insert([{ ...projectData, user_id: user.id }]).select();
            if (error) { showNotification('Error adding project: ' + error.message, true); return null; }
            this.projects.push(data[0]);
            showNotification('Project added successfully!');
            return data[0];
        },
        async updateProject(updateData) {
            const { id, ...dataToUpdate } = updateData;
            const { data, error } = await _supabase.from('projects').update(dataToUpdate).eq('id', id).select();
            if (error) { showNotification('Error updating project: ' + error.message, true); return null; }
            const index = this.projects.findIndex(p => p.id === id);
            if (index !== -1) this.projects[index] = data[0];
            showNotification('Project updated successfully!');
            return data[0];
        },
        async deleteProject(projectId) {
            await _supabase.from('tasks').delete().eq('project_id', projectId);
            const { error } = await _supabase.from('projects').delete().eq('id', projectId);
            if (error) { showNotification('Error deleting project: ' + error.message, true); return false; }
            this.projects = this.projects.filter(p => p.id !== Number(projectId));
            this.tasks = this.tasks.filter(t => t.project_id !== Number(projectId));
            showNotification('Project and its tasks deleted.');
            return true;
        },
        getProject(id) { return this.projects.find(p => p.id === Number(id)); },
        async addNote(projectId, noteText) {
            const project = this.getProject(projectId);
            if (!project) return null;
            const newNote = { id: Date.now(), text: noteText, author: user.email, timestamp: new Date().toISOString() };
            const updatedNotes = [...(project.notes || []), newNote];
            const { error } = await _supabase.from('projects').update({ notes: updatedNotes }).eq('id', projectId);
            if (error) { showNotification("Error adding note: " + error.message, true); return null; }
            project.notes = updatedNotes;
            showNotification('Note added!');
            return { project, newNote };
        },
        async deleteNote(projectId, noteId) {
            const project = this.getProject(projectId);
            if (!project || !project.notes) return false;
            const updatedNotes = project.notes.filter(note => note.id !== Number(noteId));
            const { error } = await _supabase.from('projects').update({ notes: updatedNotes }).eq('id', projectId);
            if (error) { showNotification("Error deleting note: " + error.message, true); return false; }
            project.notes = updatedNotes;
            showNotification('Note deleted.');
            return true;
        },
        async addTask(taskData) {
            const { data, error } = await _supabase.from('tasks').insert([{ ...taskData, user_id: user.id }]).select();
            if (error) { showNotification('Error adding task: ' + error.message, true); return null; }
            this.tasks.push(data[0]);
            showNotification('Task added successfully!');
            return data[0];
        },
        async updateTask(updateData) {
            const { id, ...dataToUpdate } = updateData;
            const { data, error } = await _supabase.from('tasks').update(dataToUpdate).eq('id', id).select();
            if (error) { showNotification('Error updating task: ' + error.message, true); return null; }
            const index = this.tasks.findIndex(t => t.id === Number(id));
            if (index !== -1) this.tasks[index] = data[0];
            if (Object.keys(dataToUpdate).length > 1) { showNotification('Task updated!'); }
            return data[0];
        },
        async deleteTask(taskId) {
            const { error } = await _supabase.from('tasks').delete().eq('id', taskId);
            if (error) { showNotification('Error deleting task: ' + error.message, true); return false; }
            this.tasks = this.tasks.filter(t => t.id !== Number(taskId));
            showNotification('Task deleted.');
            return true;
        },
        getTasksForProject(projectId) { return this.tasks.filter(t => Number(t.project_id) === Number(projectId)); }
    };

    // --- HELPERS & RENDERERS ---
    const formatTime = (timeString) => { if (!timeString) return ''; const [hour, minute] = timeString.split(':'); const date = new Date(); date.setHours(hour, minute); return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
    const getStatusInfo = (status) => ({ 'lead': { text: 'Lead', className: 'status-lead' }, 'dp-in-progress': { text: 'DP In Progress', className: 'status-dp-in-progress' }, 'bp-in-progress': { text: 'BP In Progress', className: 'status-bp-in-progress' }, 'complete': { text: 'Complete', className: 'status-complete' }, 'lost': { text: 'Lost', className: 'status-lost' } }[status] || { text: 'N/A', className: '' });
    const formatNoteTimestamp = (isoString) => isoString ? new Date(isoString).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';
    
    const createTaskElement = (task) => {
        const taskElement = document.createElement('div');
        const project = stateManager.getProject(task.project_id);
        const dueDate = task.due_date ? new Date(task.due_date) : null;
        const isOverdue = dueDate && !task.completed && (new Date(dueDate.toDateString()) < new Date(new Date().toDateString()));
        taskElement.className = `task-item glass-container p-4 flex items-center justify-between priority-${task.priority} ${task.completed ? 'completed' : ''}`;
        taskElement.dataset.id = task.id;
        taskElement.innerHTML = `
            <div class="flex-grow flex items-center min-w-0">
                <input type="checkbox" class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0" ${task.completed ? 'checked' : ''}>
                <div class="ml-4 min-w-0">
                    <p class="task-title font-semibold text-lg text-white truncate">${task.title}</p>
                    <div class="flex items-center flex-wrap gap-x-4 text-sm text-gray-300 mt-1">
                        ${project ? `<span><strong>Project:</strong> ${project.name}</span>` : ''}
                        ${task.due_date ? `<span class="${isOverdue ? 'text-red-400 font-semibold' : ''}"><strong>Due:</strong> ${new Date(task.due_date).toLocaleDateString()} ${task.due_time ? formatTime(task.due_time) : ''}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="flex items-center flex-shrink-0 ml-4">
                <button class="edit-task-btn text-gray-400 hover:text-white transition-colors mr-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
                <button class="delete-btn text-gray-400 hover:text-red-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>`;
        return taskElement;
    };
    
    const createProjectCardElement = (project) => {
        const projectCard = document.createElement('div');
        const statusInfo = getStatusInfo(project.status);
        projectCard.className = 'glass-container p-6 flex flex-col justify-between';
        projectCard.dataset.id = project.id;
        projectCard.innerHTML = `
            <div>
                <div class="flex justify-between items-start">
                    <div class="flex-grow cursor-pointer project-card-main min-w-0">
                        <h3 class="text-xl font-bold text-white truncate">${project.name}</h3>
                        <p class="text-sm text-gray-300 mt-1 truncate">${project.client_name || 'No client specified'}</p>
                    </div>
                    <button class="edit-project-btn text-gray-400 hover:text-white transition-colors flex-shrink-0 ml-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
                </div>
                <div class="mt-4 border-t pt-4 cursor-pointer project-card-main border-white/20">
                    <p class="text-sm truncate"><strong>Address:</strong> ${project.address || 'N/A'}</p>
                </div>
            </div>
            <div class="mt-4 flex justify-end">
                <span class="status-badge ${statusInfo.className}">${statusInfo.text}</span>
            </div>`;
        return projectCard;
    };

    const renderProjects = () => { projectList.innerHTML = ''; const filteredProjects = getFilteredProjects(); noProjectsMessage.classList.toggle('hidden', filteredProjects.length > 0); filteredProjects.forEach(project => projectList.appendChild(createProjectCardElement(project))); };
    const renderTasks = (container, taskArray, noTasksMsgEl) => { container.innerHTML = ''; noTasksMsgEl.classList.toggle('hidden', taskArray.length > 0); taskArray.sort((a, b) => (a.completed - b.completed) || new Date(a.due_date) - new Date(b.due_date) || (a.priority - b.priority)).forEach(task => container.appendChild(createTaskElement(task))); };
    
    const renderSingleProjectPage = (projectId) => {
        const project = stateManager.getProject(projectId);
        if (!project) { switchView('projects'); return; }
        const statusInfo = getStatusInfo(project.status);
        singleProjectView.dataset.projectId = project.id;
        singleProjectHeader.innerHTML = `<div class="flex justify-between items-start"><div><h3 class="text-2xl font-bold text-white">${project.name}</h3><p class="text-md text-gray-300 mt-1">${project.client_name || ''} - ${project.client_company || 'N/A'}</p></div><span class="status-badge ${statusInfo.className}">${statusInfo.text}</span></div><div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm"><p><strong>Address:</strong> ${project.address || 'N/A'}</p><p><strong>Value:</strong> $${project.value ? Number(project.value).toLocaleString() : '0'}</p><p><strong>Client Email:</strong> <a href="mailto:${project.client_email}" class="text-indigo-400 hover:underline">${project.client_email || 'N/A'}</a></p><p><strong>Client Phone:</strong> <a href="tel:${project.client_phone}" class="text-indigo-400 hover:underline">${project.client_phone || 'N/A'}</a></p></div>`;
        projectTypeDetail.textContent = project.project_type || 'N/A';
        projectCategoryDetail.textContent = project.project_category || 'N/A';
        servicesRequiredDetail.textContent = project.services_required || 'N/A';
        projectAreaDetail.textContent = `${project.project_area || '0'} ${project.area_unit || ''}`;
        possessionDateDetail.textContent = project.possession_date ? new Date(project.possession_date).toLocaleDateString() : 'N/A';
        initialNoteDetail.textContent = (project.notes && project.notes.length > 0 && project.notes[0].text) || 'No initial notes were provided.';
        renderTasks(singleProjectTaskList, stateManager.getTasksForProject(projectId), singleProjectNoTasksMessage);
        renderNotes(project);
    };
    
    const renderNotes = (project) => {
        notesListContainer.innerHTML = '';
        if (!project.notes || project.notes.length === 0) {
            notesListContainer.innerHTML = `<p class="text-gray-400 text-sm">No notes for this project yet.</p>`;
            return;
        }
        [...project.notes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = 'flex justify-between items-start bg-black/20 p-3 rounded-lg';
            noteEl.dataset.noteId = note.id;
            noteEl.innerHTML = `<div class="flex-grow mr-4"><p class="text-white whitespace-pre-wrap">${note.text}</p><p class="text-xs text-gray-400 mt-1">${note.author ? note.author.split('@')[0] : 'User'} - ${formatNoteTimestamp(note.timestamp)}</p></div><button class="delete-note-btn text-gray-400 hover:text-white flex-shrink-0 mt-1"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>`;
            notesListContainer.appendChild(noteEl);
        });
    };
    
    const populateProjectDropdowns = () => { [taskProjectSelect, editTaskForm.querySelector('#edit-task-project-select'), filterProject].forEach(dropdown => { const selectedValue = dropdown.value; dropdown.innerHTML = `<option value="${dropdown.id === 'filter-project' ? 'all' : 'none'}">${dropdown.id === 'filter-project' ? 'All Projects' : 'No Project'}</option>`; stateManager.projects.forEach(project => { dropdown.innerHTML += `<option value="${project.id}">${project.name}</option>`; }); dropdown.value = selectedValue; }); };

    // --- FILTERING LOGIC ---
    const getFilteredProjects = () => { let filtered = [...stateManager.projects]; const { status, tasksDue } = stateManager.projectFilters; if (status !== 'all') { filtered = filtered.filter(p => p.status === status); } if (tasksDue !== 'all') { const today = new Date(); today.setHours(0, 0, 0, 0); filtered = filtered.filter(project => stateManager.getTasksForProject(project.id).some(task => { if (!task.due_date) return false; const dueDate = new Date(task.due_date); if (tasksDue === 'today') return dueDate.toDateString() === today.toDateString(); if (tasksDue === 'tomorrow') { const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1); return dueDate.toDateString() === tomorrow.toDateString(); } if (tasksDue === 'this-week') { const dayOfWeek = today.getDay(); const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); return dueDate >= startOfWeek && dueDate <= endOfWeek; } if (tasksDue === 'overdue') return dueDate < today && !task.completed; return false; })); } return filtered; };
    const getFilteredTasks = () => { let filtered = [...stateManager.tasks]; const { project, priority, dateRange } = stateManager.taskFilters; if (project !== 'all') { filtered = filtered.filter(task => String(task.project_id) === String(project)); } if (priority !== 'all') { filtered = filtered.filter(task => String(task.priority) === String(priority)); } if (dateRange !== 'all') { const today = new Date(new Date().toDateString()); if (dateRange === 'today') { filtered = filtered.filter(task => task.due_date && new Date(task.due_date).toDateString() === today.toDateString()); } else if (dateRange === 'this-week') { const dayOfWeek = today.getDay(); const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); filtered = filtered.filter(task => task.due_date && new Date(task.due_date) >= startOfWeek && new Date(task.due_date) <= endOfWeek); } else if (dateRange === 'overdue') { filtered = filtered.filter(task => task.due_date && !task.completed && new Date(task.due_date) < today); } } return filtered; };

    // --- MODALS & EVENT HANDLERS ---
    const openModal = (modal) => { modal.classList.remove('opacity-0', 'pointer-events-none'); modal.querySelector('.modal-container').classList.remove('scale-95'); };
    const closeModal = (modal) => { modal.classList.add('opacity-0', 'pointer-events-none'); modal.querySelector('.modal-container').classList.add('scale-95'); };
    
    let confirmationCallback = null;
    const openConfirmationModal = (title, message, onConfirm) => { confirmationTitle.textContent = title; confirmationMessage.textContent = message; confirmationCallback = onConfirm; openModal(confirmationModal); };
    
    const switchView = (view, projectId = null) => {
        stateManager.currentProjectId = projectId;
        [projectsView, tasksView, singleProjectView].forEach(v => v.classList.add('hidden'));
        [tabBtnProjects, tabBtnTasks].forEach(b => b.classList.remove('active'));
        fabAddButton.classList.toggle('hidden', view === 'single-project');

        if (view === 'projects') { projectsView.classList.remove('hidden'); tabBtnProjects.classList.add('active'); renderProjects(); } 
        else if (view === 'tasks') { tasksView.classList.remove('hidden'); tabBtnTasks.classList.add('active'); renderTasks(taskList, getFilteredTasks(), noTasksMessage); } 
        else if (view === 'single-project') { singleProjectView.classList.remove('hidden'); tabBtnProjects.classList.add('active'); renderSingleProjectPage(projectId); }
    };
    
    const handleFabClick = () => {
        if (tabBtnProjects.classList.contains('active')) openModal(addProjectModal);
        else if (tabBtnTasks.classList.contains('active')) openModal(addTaskModal);
    };

    const handleAddProject = async (e) => {
        e.preventDefault();
        const addButton = e.target.querySelector('button[type="submit"]');
        startButtonLoading(addButton);
        const newProject = await stateManager.addProject({
            name: document.getElementById('project-name').value.trim(),
            client_name: document.getElementById('project-client-name').value.trim(),
            address: document.getElementById('project-address').value.trim(),
            status: document.getElementById('project-status').value,
            value: document.getElementById('project-value').value || null,
            client_phone: document.getElementById('project-client-phone').value.trim(),
            client_email: document.getElementById('project-client-email').value.trim(),
            notes: document.getElementById('project-notes').value.trim() ? [{ id: Date.now(), text: document.getElementById('project-notes').value.trim(), author: user.email, timestamp: new Date().toISOString() }] : [],
        });
        if (newProject) {
            renderProjects();
            populateProjectDropdowns();
            addProjectForm.reset();
            closeModal(addProjectModal);
        }
        stopButtonLoading(addButton);
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        const addButton = e.target.querySelector('button[type="submit"]');
        startButtonLoading(addButton);
        const newTask = await stateManager.addTask({
            title: document.getElementById('task-title').value.trim(),
            project_id: document.getElementById('task-project-select').value,
            due_date: document.getElementById('task-due-date').value,
            due_time: document.getElementById('task-due-time').value,
            priority: document.getElementById('task-priority').value,
        });
        if (newTask) {
            renderTasks(taskList, getFilteredTasks(), noTasksMessage);
            addTaskForm.reset();
            closeModal(addTaskModal);
        }
        stopButtonLoading(addButton);
    };
    
    const openEditProjectModal = (project) => {
        editProjectForm.querySelector('#edit-project-id').value = project.id;
        editProjectForm.querySelector('#edit-project-name').value = project.name || '';
        editProjectForm.querySelector('#edit-project-status').value = project.status || 'lead';
        editProjectForm.querySelector('#edit-project-client-name').value = project.client_name || '';
        editProjectForm.querySelector('#edit-project-client-company').value = project.client_company || '';
        editProjectForm.querySelector('#edit-project-address').value = project.address || '';
        editProjectForm.querySelector('#edit-project-value').value = project.value || '';
        editProjectForm.querySelector('#edit-project-client-phone').value = project.client_phone || '';
        editProjectForm.querySelector('#edit-project-client-email').value = project.client_email || '';
        editProjectForm.querySelector('#edit-project-type').value = project.project_type || '';
        editProjectForm.querySelector('#edit-project-category').value = project.project_category || '';
        editProjectForm.querySelector('#edit-services-required').value = project.services_required || '';
        editProjectForm.querySelector('#edit-possession-date').value = project.possession_date || '';
        editProjectForm.querySelector('#edit-project-area').value = project.project_area || '';
        editProjectForm.querySelector('#edit-area-unit').value = project.area_unit || '';
        openModal(editProjectModal);
    };

    const openEditTaskModal = (task) => {
        editTaskForm.querySelector('#edit-task-id').value = task.id;
        editTaskForm.querySelector('#edit-task-title').value = task.title;
        editTaskForm.querySelector('#edit-task-project-select').value = task.project_id || 'none';
        editTaskForm.querySelector('#edit-task-due-date').value = task.due_date || '';
        editTaskForm.querySelector('#edit-task-due-time').value = task.due_time || '';
        editTaskForm.querySelector('#edit-task-priority').value = task.priority;
        openModal(editTaskModal);
    };

    // --- INITIALIZATION ---
    const init = async () => {
        await stateManager.loadData();
        setupThemeSwitcher('theme-switcher', 'taskrTheme');
        populateProjectDropdowns();
        switchView('projects');

        // Event Listeners
        logoutBtn.addEventListener('click', async () => { await _supabase.auth.signOut(); window.location.href = 'login.html'; });
        tabBtnProjects.addEventListener('click', () => switchView('projects'));
        tabBtnTasks.addEventListener('click', () => switchView('tasks'));
        backToProjectsBtn.addEventListener('click', () => switchView('projects'));
        fabAddButton.addEventListener('click', handleFabClick);
        
        addProjectForm.addEventListener('submit', handleAddProject);
        addTaskForm.addEventListener('submit', handleAddTask);
        addNoteForm.addEventListener('submit', async (e) => { e.preventDefault(); const btn = e.target.querySelector('button'); startButtonLoading(btn); const text = addNoteForm.querySelector('input').value.trim(); if (text) { const result = await stateManager.addNote(stateManager.currentProjectId, text); if (result) { renderNotes(result.project); addNoteForm.reset(); } } stopButtonLoading(btn); });
        editProjectForm.addEventListener('submit', async (e) => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); startButtonLoading(btn); const id = Number(editProjectForm.querySelector('#edit-project-id').value); const data = { id, name: editProjectForm.querySelector('#edit-project-name').value.trim(), status: editProjectForm.querySelector('#edit-project-status').value, client_name: editProjectForm.querySelector('#edit-project-client-name').value.trim(), client_company: editProjectForm.querySelector('#edit-project-client-company').value.trim(), address: editProjectForm.querySelector('#edit-project-address').value.trim(), value: editProjectForm.querySelector('#edit-project-value').value || null, client_phone: editProjectForm.querySelector('#edit-project-client-phone').value.trim(), client_email: editProjectForm.querySelector('#edit-project-client-email').value.trim(), project_type: editProjectForm.querySelector('#edit-project-type').value.trim(), project_category: editProjectForm.querySelector('#edit-project-category').value.trim(), services_required: editProjectForm.querySelector('#edit-services-required').value.trim(), possession_date: editProjectForm.querySelector('#edit-possession-date').value || null, project_area: editProjectForm.querySelector('#edit-project-area').value || null, area_unit: editProjectForm.querySelector('#edit-area-unit').value.trim() }; const res = await stateManager.updateProject(data); if (res) { renderProjects(); populateProjectDropdowns(); if (stateManager.currentProjectId === id) renderSingleProjectPage(id); closeModal(editProjectModal); } stopButtonLoading(btn); });
        editTaskForm.addEventListener('submit', async (e) => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); startButtonLoading(btn); const id = Number(editTaskForm.querySelector('#edit-task-id').value); const data = { id, title: editTaskForm.querySelector('#edit-task-title').value.trim(), project_id: editTaskForm.querySelector('#edit-task-project-select').value, due_date: editTaskForm.querySelector('#edit-task-due-date').value, due_time: editTaskForm.querySelector('#edit-task-due-time').value, priority: editTaskForm.querySelector('#edit-task-priority').value }; const res = await stateManager.updateTask(data); if (res) { if (!tasksView.classList.contains('hidden')) renderTasks(taskList, getFilteredTasks(), noTasksMessage); else renderSingleProjectPage(stateManager.currentProjectId); closeModal(editTaskModal); } stopButtonLoading(btn); });
        
        projectList.addEventListener('click', (e) => { const card = e.target.closest('[data-id]'); if (!card) return; const id = Number(card.dataset.id); if (e.target.closest('.edit-project-btn')) { openEditProjectModal(stateManager.getProject(id)); } else if (e.target.closest('.project-card-main')) { switchView('single-project', id); } });
        const taskInteractionHandler = (e) => { const el = e.target.closest('.task-item'); if (!el) return; const id = Number(el.dataset.id); if (e.target.closest('.delete-btn')) { openConfirmationModal('Delete Task?', 'Are you sure you want to delete this task?', async () => { if (await stateManager.deleteTask(id)) { el.remove(); } }); } else if (e.target.closest('.edit-task-btn')) { openEditTaskModal(stateManager.tasks.find(t => t.id === id)); } else if (e.target.type === 'checkbox') { stateManager.updateTask({ id, completed: e.target.checked }); el.classList.toggle('completed', e.target.checked); } };
        taskList.addEventListener('click', taskInteractionHandler);
        singleProjectTaskList.addEventListener('click', taskInteractionHandler);
        notesListContainer.addEventListener('click', (e) => { const btn = e.target.closest('.delete-note-btn'); if (btn) { const noteEl = btn.closest('[data-note-id]'); const noteId = Number(noteEl.dataset.noteId); openConfirmationModal('Delete Note?', 'Are you sure?', async () => { if (await stateManager.deleteNote(stateManager.currentProjectId, noteId)) noteEl.remove(); }); }});
        
        cancelAddProjectBtn.addEventListener('click', () => closeModal(addProjectModal));
        cancelAddTaskBtn.addEventListener('click', () => closeModal(addTaskModal));
        cancelEditProjectBtn.addEventListener('click', () => closeModal(editProjectModal));
        deleteProjectBtn.addEventListener('click', () => { const id = Number(editProjectForm.querySelector('#edit-project-id').value); openConfirmationModal('Delete Project?', 'This will also delete all associated tasks. This cannot be undone.', async () => { if (await stateManager.deleteProject(id)) { closeModal(editProjectModal); switchView('projects'); } }); });
        cancelEditTaskBtn.addEventListener('click', () => closeModal(editTaskModal));
        confirmActionBtn.addEventListener('click', () => { if (confirmationCallback) confirmationCallback(); closeModal(confirmationModal); });
        cancelConfirmationBtn.addEventListener('click', () => closeModal(confirmationModal));
        
        [filterProject, filterPriority, filterDate].forEach(el => el.addEventListener('change', () => renderTasks(taskList, getFilteredTasks(), noTasksMessage)));
        clearFiltersBtn.addEventListener('click', () => { [filterProject, filterPriority, filterDate].forEach(el => el.value = 'all'); renderTasks(taskList, getFilteredTasks(), noTasksMessage); });
        [filterProjectStatus, filterProjectTasksDue].forEach(el => el.addEventListener('change', renderProjects));
        clearProjectFiltersBtn.addEventListener('click', () => { [filterProjectStatus, filterProjectTasksDue].forEach(el => el.value = 'all'); renderProjects(); });

        // This is the final step: make the app visible after everything is loaded.
        appContent.classList.remove('opacity-0');
    }
    
    init();
});