const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory data storage (in a real app, you'd use a database)
let seats = [];
let students = [];
let routes = [];

// Initialize with sample data
function initializeData() {
    // Create 40 seats (5 rows x 8 seats)
    seats = [];
    for (let row = 1; row <= 5; row++) {
        for (let seat = 1; seat <= 8; seat++) {
            seats.push({
                id: `${row}-${seat}`,
                row: row,
                seat: seat,
                isOccupied: false,
                studentId: null,
                routeId: null
            });
        }
    }

    // Sample routes
    routes = [
        { id: 1, name: "Route A - Downtown", capacity: 20 },
        { id: 2, name: "Route B - Suburbs", capacity: 20 },
        { id: 3, name: "Route C - Rural", capacity: 20 }
    ];

    // Sample students
    students = [
        { id: 1, name: "Shreyansh singh ", grade: "10th", routeId: 1 },
        { id: 2, name: "Sudhanshu Dubey", grade: "9th", routeId: 2 },
        { id: 3, name: "Abhishek pal", grade: "11th", routeId: 1 }
    ];
}

// Initialize data on server start
initializeData();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.get('/api/seats', (req, res) => {
    res.json(seats);
});

app.get('/api/students', (req, res) => {
    res.json(students);
});

app.get('/api/routes', (req, res) => {
    res.json(routes);
});

// Assign seat to student
app.post('/api/assign-seat', (req, res) => {
    const { studentId, seatId } = req.body;
    
    const student = students.find(s => s.id == studentId);
    const seat = seats.find(s => s.id === seatId);
    
    if (!student || !seat) {
        return res.status(404).json({ error: 'Student or seat not found' });
    }
    
    if (seat.isOccupied) {
        return res.status(400).json({ error: 'Seat is already occupied' });
    }
    
    // Check if student already has a seat
    const existingSeat = seats.find(s => s.studentId == studentId);
    if (existingSeat) {
        existingSeat.isOccupied = false;
        existingSeat.studentId = null;
        existingSeat.routeId = null;
    }
    
    // Assign the seat
    seat.isOccupied = true;
    seat.studentId = studentId;
    seat.routeId = student.routeId;
    
    res.json({ success: true, seat, student });
});

// Remove seat assignment
app.post('/api/remove-seat', (req, res) => {
    const { seatId } = req.body;
    
    const seat = seats.find(s => s.id === seatId);
    
    if (!seat) {
        return res.status(404).json({ error: 'Seat not found' });
    }
    
    seat.isOccupied = false;
    seat.studentId = null;
    seat.routeId = null;
    
    res.json({ success: true, seat });
});

// Add new student
app.post('/api/students', (req, res) => {
    const { name, grade, routeId } = req.body;
    
    if (!name || !grade || !routeId) {
        return res.status(400).json({ error: 'Name, grade, and route are required' });
    }
    
    const newStudent = {
        id: students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1,
        name,
        grade,
        routeId: parseInt(routeId)
    };
    
    students.push(newStudent);
    res.json(newStudent);
});

// Add new route
app.post('/api/routes', (req, res) => {
    const { name, capacity } = req.body;
    
    if (!name || !capacity) {
        return res.status(400).json({ error: 'Name and capacity are required' });
    }
    
    const newRoute = {
        id: routes.length > 0 ? Math.max(...routes.map(r => r.id)) + 1 : 1,
        name,
        capacity: parseInt(capacity)
    };
    
    routes.push(newRoute);
    res.json(newRoute);
});

// Get seat assignments by route
app.get('/api/seats/route/:routeId', (req, res) => {
    const routeId = parseInt(req.params.routeId);
    const routeSeats = seats.filter(seat => seat.routeId === routeId);
    res.json(routeSeats);
});

// Reset all seat assignments
app.post('/api/reset-seats', (req, res) => {
    seats.forEach(seat => {
        seat.isOccupied = false;
        seat.studentId = null;
        seat.routeId = null;
    });
    res.json({ success: true, message: 'All seats have been reset' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}); 