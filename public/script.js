// Global variables
let seats = [];
let students = [];
let routes = [];
let selectedRouteFilter = '';

// DOM elements
const seatGrid = document.getElementById('seatGrid');
const studentsList = document.getElementById('studentsList');
const routesList = document.getElementById('routesList');
const routeFilter = document.getElementById('routeFilter');
const totalSeatsEl = document.getElementById('totalSeats');
const occupiedSeatsEl = document.getElementById('occupiedSeats');
const availableSeatsEl = document.getElementById('availableSeats');

// Modal elements
const studentModal = document.getElementById('studentModal');
const routeModal = document.getElementById('routeModal');
const seatModal = document.getElementById('seatModal');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// Initialize the application
async function initializeApp() {
    try {
        await loadData();
        renderSeats();
        renderStudents();
        renderRoutes();
        updateStats();
        populateRouteFilter();
    } catch (error) {
        console.error('Error initializing app:', error);
        showMessage('Error loading data. Please refresh the page.', 'error');
    }
}

// Load data from server
async function loadData() {
    try {
        const [seatsResponse, studentsResponse, routesResponse] = await Promise.all([
            fetch('/api/seats'),
            fetch('/api/students'),
            fetch('/api/routes')
        ]);

        seats = await seatsResponse.json();
        students = await studentsResponse.json();
        routes = await routesResponse.json();
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Modal buttons
    document.getElementById('addStudentBtn').addEventListener('click', () => openModal(studentModal));
    document.getElementById('addRouteBtn').addEventListener('click', () => openModal(routeModal));
    
    // Form submissions
    document.getElementById('studentForm').addEventListener('submit', handleAddStudent);
    document.getElementById('routeForm').addEventListener('submit', handleAddRoute);
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => closeAllModals());
    });
    
    // Cancel buttons
    document.getElementById('cancelStudent').addEventListener('click', () => closeAllModals());
    document.getElementById('cancelRoute').addEventListener('click', () => closeAllModals());
    
    // Action buttons
    document.getElementById('resetSeatsBtn').addEventListener('click', handleResetSeats);
    document.getElementById('exportBtn').addEventListener('click', handleExportData);
    
    // Route filter
    routeFilter.addEventListener('change', handleRouteFilterChange);
    
    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

// Render seats grid
function renderSeats() {
    seatGrid.innerHTML = '';
    
    const filteredSeats = selectedRouteFilter 
        ? seats.filter(seat => seat.routeId == selectedRouteFilter || !seat.isOccupied)
        : seats;
    
    filteredSeats.forEach(seat => {
        const seatElement = createSeatElement(seat);
        seatGrid.appendChild(seatElement);
    });
}

// Create individual seat element
function createSeatElement(seat) {
    const seatDiv = document.createElement('div');
    seatDiv.className = `seat ${seat.isOccupied ? 'occupied' : 'available'}`;
    seatDiv.dataset.seatId = seat.id;
    
    const student = students.find(s => s.id == seat.studentId);
    const route = routes.find(r => r.id == seat.routeId);
    
    seatDiv.innerHTML = `
        <div class="seat-number">${seat.id}</div>
        ${seat.isOccupied && student ? `<div class="student-name">${student.name}</div>` : ''}
    `;
    
    seatDiv.addEventListener('click', () => handleSeatClick(seat));
    
    return seatDiv;
}

// Handle seat click
function handleSeatClick(seat) {
    const student = students.find(s => s.id == seat.studentId);
    const route = routes.find(r => r.id == seat.routeId);
    
    const modalContent = document.getElementById('seatModalContent');
    
    if (seat.isOccupied) {
        // Show occupied seat info
        modalContent.innerHTML = `
            <div class="seat-assignment">
                <div class="seat-info">
                    <h4>Seat ${seat.id}</h4>
                    <p><strong>Occupied by:</strong> ${student.name}</p>
                    <p><strong>Grade:</strong> ${student.grade}</p>
                    <p><strong>Route:</strong> ${route.name}</p>
                </div>
                <div class="form-actions">
                    <button class="btn btn-danger" onclick="handleRemoveSeat('${seat.id}')">
                        <i class="fas fa-times"></i> Remove Assignment
                    </button>
                    <button class="btn btn-secondary" onclick="closeAllModals()">Cancel</button>
                </div>
            </div>
        `;
    } else {
        // Show assignment options
        const availableStudents = students.filter(s => !seats.find(seat => seat.studentId == s.id));
        
        if (availableStudents.length === 0) {
            modalContent.innerHTML = `
                <div class="seat-assignment">
                    <div class="seat-info">
                        <h4>Seat ${seat.id}</h4>
                        <p>No available students to assign to this seat.</p>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-secondary" onclick="closeAllModals()">Close</button>
                    </div>
                </div>
            `;
        } else {
            const studentOptions = availableStudents.map(s => 
                `<option value="${s.id}">${s.name} (${s.grade}) - ${routes.find(r => r.id == s.routeId).name}</option>`
            ).join('');
            
            modalContent.innerHTML = `
                <div class="seat-assignment">
                    <div class="seat-info">
                        <h4>Seat ${seat.id}</h4>
                        <p>Select a student to assign to this seat:</p>
                    </div>
                    <div class="student-select">
                        <label for="studentSelect">Student:</label>
                        <select id="studentSelect">
                            ${studentOptions}
                        </select>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-primary" onclick="handleAssignSeat('${seat.id}')">
                            <i class="fas fa-check"></i> Assign Seat
                        </button>
                        <button class="btn btn-secondary" onclick="closeAllModals()">Cancel</button>
                    </div>
                </div>
            `;
        }
    }
    
    openModal(seatModal);
}

// Handle seat assignment
async function handleAssignSeat(seatId) {
    const studentSelect = document.getElementById('studentSelect');
    const studentId = studentSelect.value;
    
    if (!studentId) {
        showMessage('Please select a student.', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/assign-seat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ studentId, seatId })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            await loadData();
            renderSeats();
            renderStudents();
            updateStats();
            closeAllModals();
            showMessage('Seat assigned successfully!', 'success');
        } else {
            showMessage(result.error || 'Failed to assign seat.', 'error');
        }
    } catch (error) {
        console.error('Error assigning seat:', error);
        showMessage('Error assigning seat. Please try again.', 'error');
    }
}

// Handle seat removal
async function handleRemoveSeat(seatId) {
    try {
        const response = await fetch('/api/remove-seat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ seatId })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            await loadData();
            renderSeats();
            renderStudents();
            updateStats();
            closeAllModals();
            showMessage('Seat assignment removed successfully!', 'success');
        } else {
            showMessage(result.error || 'Failed to remove seat assignment.', 'error');
        }
    } catch (error) {
        console.error('Error removing seat:', error);
        showMessage('Error removing seat assignment. Please try again.', 'error');
    }
}

// Render students list
function renderStudents() {
    studentsList.innerHTML = '';
    
    students.forEach(student => {
        const route = routes.find(r => r.id == student.routeId);
        const assignedSeat = seats.find(s => s.studentId == student.id);
        
        const studentDiv = document.createElement('div');
        studentDiv.className = 'list-item';
        studentDiv.innerHTML = `
            <div class="item-info">
                <div class="item-name">${student.name}</div>
                <div class="item-details">
                    ${student.grade} • ${route.name}
                    ${assignedSeat ? ` • Seat ${assignedSeat.id}` : ' • No seat assigned'}
                </div>
            </div>
        `;
        
        studentsList.appendChild(studentDiv);
    });
}

// Render routes list
function renderRoutes() {
    routesList.innerHTML = '';
    
    routes.forEach(route => {
        const routeStudents = students.filter(s => s.routeId == route.id);
        const assignedStudents = routeStudents.filter(s => seats.find(seat => seat.studentId == s.id));
        
        const routeDiv = document.createElement('div');
        routeDiv.className = 'list-item';
        routeDiv.innerHTML = `
            <div class="item-info">
                <div class="item-name">${route.name}</div>
                <div class="item-details">
                    ${assignedStudents.length}/${routeStudents.length} students assigned
                </div>
            </div>
        `;
        
        routesList.appendChild(routeDiv);
    });
}

// Populate route filter
function populateRouteFilter() {
    routeFilter.innerHTML = '<option value="">All Routes</option>';
    
    routes.forEach(route => {
        const option = document.createElement('option');
        option.value = route.id;
        option.textContent = route.name;
        routeFilter.appendChild(option);
    });
}

// Handle route filter change
function handleRouteFilterChange() {
    selectedRouteFilter = routeFilter.value;
    renderSeats();
}

// Update statistics
function updateStats() {
    const total = seats.length;
    const occupied = seats.filter(s => s.isOccupied).length;
    const available = total - occupied;
    
    totalSeatsEl.textContent = total;
    occupiedSeatsEl.textContent = occupied;
    availableSeatsEl.textContent = available;
}

// Handle add student
async function handleAddStudent(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const studentData = {
        name: formData.get('studentName') || document.getElementById('studentName').value,
        grade: formData.get('studentGrade') || document.getElementById('studentGrade').value,
        routeId: formData.get('studentRoute') || document.getElementById('studentRoute').value
    };
    
    if (!studentData.name || !studentData.grade || !studentData.routeId) {
        showMessage('Please fill in all fields.', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/students', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(studentData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            await loadData();
            renderStudents();
            populateRouteFilter();
            closeAllModals();
            event.target.reset();
            showMessage('Student added successfully!', 'success');
        } else {
            showMessage(result.error || 'Failed to add student.', 'error');
        }
    } catch (error) {
        console.error('Error adding student:', error);
        showMessage('Error adding student. Please try again.', 'error');
    }
}

// Handle add route
async function handleAddRoute(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const routeData = {
        name: formData.get('routeName') || document.getElementById('routeName').value,
        capacity: formData.get('routeCapacity') || document.getElementById('routeCapacity').value
    };
    
    if (!routeData.name || !routeData.capacity) {
        showMessage('Please fill in all fields.', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/routes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(routeData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            await loadData();
            renderRoutes();
            populateRouteFilter();
            closeAllModals();
            event.target.reset();
            showMessage('Route added successfully!', 'success');
        } else {
            showMessage(result.error || 'Failed to add route.', 'error');
        }
    } catch (error) {
        console.error('Error adding route:', error);
        showMessage('Error adding route. Please try again.', 'error');
    }
}

// Handle reset seats
async function handleResetSeats() {
    if (!confirm('Are you sure you want to reset all seat assignments? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/reset-seats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            await loadData();
            renderSeats();
            renderStudents();
            updateStats();
            showMessage('All seats have been reset successfully!', 'success');
        } else {
            showMessage(result.error || 'Failed to reset seats.', 'error');
        }
    } catch (error) {
        console.error('Error resetting seats:', error);
        showMessage('Error resetting seats. Please try again.', 'error');
    }
}

// Handle export data
function handleExportData() {
    const exportData = {
        seats: seats,
        students: students,
        routes: routes,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `bus-seat-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showMessage('Data exported successfully!', 'success');
}

// Modal functions
function openModal(modal) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

// Show message
function showMessage(message, type = 'success') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert at the top of the container
    const container = document.querySelector('.container');
    container.insertBefore(messageDiv, container.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Populate student route dropdown
function populateStudentRouteDropdown() {
    const studentRouteSelect = document.getElementById('studentRoute');
    studentRouteSelect.innerHTML = '<option value="">Select Route</option>';
    
    routes.forEach(route => {
        const option = document.createElement('option');
        option.value = route.id;
        option.textContent = route.name;
        studentRouteSelect.appendChild(option);
    });
}

// Update student route dropdown when modal opens
document.getElementById('addStudentBtn').addEventListener('click', () => {
    populateStudentRouteDropdown();
}); 