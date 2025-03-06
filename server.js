const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2');  // Using mysql2 for MySQL connection
const session = require('express-session');
const router = express.Router();             
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

connection.connect((err) => {
    if (err) {
        console.error('Database connection error:', err);
        return;
    }
    console.log('✅ Connected to Render MySQL Database');
});

module.exports = connection;


// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database: ' + err.stack);
    return;
  }
  console.log('Connected to the database as ID ' + connection.threadId);
});

const app = express();
const port = 3001;
const saltRounds = 10;

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
//to create a session
app.use(session({
    secret: 'your_secret_key',  // Change this to a strong secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }   // Set to `true` if using HTTPS
}));


// ✅ Check Database Connection
connection.query('SELECT 1', (err, results) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    return;
  }
  console.log('✅ Connected to MySQL Database');
});

// ✅ Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'HR_signup.html'));
});

// ✅ HR Signup Route : WORKING
app.post('/signupHR', async (req, res) => {
    const { fullName, hrId, email, password } = req.body;

    if (!fullName || !hrId || !email || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // ✅ Insert HR into DB using the connection
        connection.execute('INSERT INTO HR (HR_ID, password, name, email) VALUES (?, ?, ?, ?)', 
            [hrId, hashedPassword, fullName, email], (err, results) => {
            if (err) {
                console.error('❌ Database Error:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            res.status(200).json({
                success: true,
                message: 'HR Signup Successful',
                hrId: hrId,
                hrName: fullName // Include name here as well
            });
        });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// ✅ HR Login Route : WORKING
app.post("/loginHR", async (req, res) => {
    const { hrId, email, password } = req.body;

    if (!hrId || !email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    connection.execute("SELECT * FROM HR WHERE HR_ID = ? AND email = ?", [hrId, email], async (err, rows) => {
        if (err) {
            console.error("❌ Database Error:", err);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid credentials, please sign up first" });
        }

        const hr = rows[0];
        const passwordMatch = await bcrypt.compare(password, hr.password);

        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        res.status(200).json({
            success: true,
            message: "Login successful",
            hrId: hr.HR_ID,
            hrName: hr.name // Include name here
        });
        
    });
});

// ✅ Endpoint to add an employee : WORKING
app.post("/addEmployee", async (req, res) => {
    const { hrId, name, address, employeeID, password, email, phone, department, role } = req.body;

    console.log("Received data:", req.body); // Log incoming data correctly

    try {
        const hashedPassword = password; // Store plain text password

        const insertEmployeeQuery = `
            INSERT INTO employees (hrId, name, address, employeeID, password, email, phone, department, role)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        connection.query(insertEmployeeQuery, 
            [hrId, name, address, employeeID, hashedPassword, email, phone, department, role], 
            (err, result) => {
                if (err) {
                    console.error("Error inserting employee:", err);
                    return res.status(500).json({ error: "Error inserting employee", details: err });
                }

                console.log("Employee added successfully:", result);
                res.status(200).json({ message: "Employee added successfully", data: result });
            }
        );

    } catch (err) {
        console.error("Error hashing password:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});



// ✅ Endpoint to get employees for a specific HR : WORKING
app.get("/getEmployees", (req, res) => {
    const hrId = req.query.hrId;

    // Query to get all employees associated with the given HR ID
    const getEmployeesQuery = `SELECT * FROM employees WHERE hrId = ?`;

    connection.query(getEmployeesQuery, [hrId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Error fetching employees", details: err });
        }
        res.status(200).json(results);
    });
});

// ✅ Endpoint to delete an employee : WORKING
app.delete('/deleteEmployee/:employeeID', (req, res) => {
    const { employeeID } = req.params;  // Extract the employeeID from the URL params

    const query = `DELETE FROM employees WHERE employeeID = ?`;

    connection.query(query, [employeeID], (err, result) => {
        if (err) {
            console.error('Error deleting employee:', err);
            return res.status(500).send('Error deleting employee');
        }
        res.send('Employee deleted successfully');
    });
});

// ✅ Employee login endpoint : WORKING
app.post("/loginEmp", (req, res) => {
    const { employeeId, email, password } = req.body;

    const query = "SELECT * FROM employees WHERE employeeID = ? AND email = ?";

    connection.query(query, [employeeId, email], async (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid credentials, please sign up first" });
        }

        const user = results[0]; // Get the user from the results

        const match = password === user.password; // Direct comparison// Compare passwords

        if (!match) {
            return res.status(401).json({ success: false, message: "Invalid credentials. Please try again." });
        }

        // Login successful
        res.json({
            success: true,
            message: "Login successful",
            user: { name: user.name, employeeId: user.employeeID },
        });
    });
});


// ✅ Moved this outside
//get emp id
app.get('/get-employee-id', (req, res) => {
    const employeeId = req.session.employeeId; // Get employee ID from the session
    if (!employeeId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ employeeId });
});

//Emp Attendance
app.get("/attendance/:employeeId", async (req, res) => {
    const employeeId = req.params.employeeId;

    const totalDaysQuery = `SELECT COUNT(*) AS totalDays FROM attendance WHERE employeeID = ?`;
    const presentDaysQuery = `SELECT COUNT(*) AS presentDays FROM attendance WHERE employeeID = ? AND status = 'Present'`;

    connection.query(totalDaysQuery, [employeeId], (err, totalResult) => {
        if (err) return res.status(500).json({ success: false, message: "Database error", error: err });

        connection.query(presentDaysQuery, [employeeId], (err, presentResult) => {
            if (err) return res.status(500).json({ success: false, message: "Database error", error: err });

            const totalDays = totalResult[0].totalDays;
            const presentDays = presentResult[0].presentDays;
            const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0;

            res.json({ success: true, attendancePercentage });
        });
    });
});
 
//Emp leave balance 
app.get("/leaveBalance/:employeeId", async (req, res) => {
    const employeeId = req.params.employeeId;

    const leaveQuery = `
        SELECT total_leaves, used_leaves 
        FROM employees 
        WHERE employeeID = ?`;

    connection.query(leaveQuery, [employeeId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error", error: err });

        if (result.length === 0) return res.json({ success: false, message: "Employee not found" });

        const totalLeaves = result[0].total_leaves;
        const usedLeaves = result[0].used_leaves;
        const remainingLeaves = totalLeaves - usedLeaves;

        res.json({ success: true, totalLeaves, remainingLeaves });
    });
});

//emp performace score
app.get("/performance/:employeeId", async (req, res) => {
    const employeeId = req.params.employeeId;

    const performanceQuery = `
        SELECT AVG(score) AS avgPerformance 
        FROM performance_reviews 
        WHERE employeeID = ?`;

    connection.query(performanceQuery, [employeeId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error", error: err });

        const avgPerformance = result[0].avgPerformance ? result[0].avgPerformance.toFixed(1) : "N/A";
        res.json({ success: true, avgPerformance });
    });
});

// Endpoint to fetch last attendance and leave request
app.get("/employee/latest-activity/:employeeId", (req, res) => {
    const employeeId = req.params.employeeId;

    const attendanceQuery = `
        SELECT status, DATE_FORMAT(timestamp, '%M %d, %Y %h:%i %p') AS formatted_date 
        FROM attendance 
        WHERE employee_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 1;
    `;

    const leaveQuery = `
        SELECT leave_date, status 
        FROM leave_request 
        WHERE employeeID = ? 
        ORDER BY leave_date DESC 
        LIMIT 1;
    `;

    connection.query(attendanceQuery, [employeeId], (err, attendanceResult) => {
        if (err) return res.status(500).json({ error: err.message });

        connection.query(leaveQuery, [employeeId], (err, leaveResult) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
                attendance: attendanceResult[0] || null,
                leave: leaveResult[0] || null
            });
        });
    });
});

//Fetch emp from hr_id
app.get('/employees/:hr_id', (req, res) => {
    const { hr_id } = req.params;
    const sql = `SELECT * FROM employees WHERE hrId = ?`;
    connection.query(sql, [hr_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
    });
});

//Store Leave Request to Database
app.post("/leave-request", (req, res) => {
    const { employeeID, leaveType, startDate, endDate, reason } = req.body;

    if (!employeeID || !leaveType || !startDate || !endDate || !reason) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const query = `INSERT INTO leave_request(employeeID, leave_type, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, ?, 'Pending')`;

    connection.query(query, [employeeID, leaveType, startDate, endDate, reason], (err, result) => {
        if (err) {
            console.error("Error inserting leave request:", err);
            return res.status(500).json({ message: "Database error" });
        }
        res.status(200).json({ message: "Leave request submitted successfully" });
    });
});

// Fetch leave requests for a specific HR
app.get("/HRleave-requests", async (req, res) => {
    const { hrId } = req.query;
    const sql = `
        SELECT l.id, e.name AS employee_name, l.leave_type, l.start_date, l.end_date, l.reason, l.status
        FROM leave_request l
        JOIN employees e ON l.employeeID = e.id
        WHERE e.hrId = ?;
    `;

    connection.query(sql, [hrId], (err, results) => {
        if (err) {
            console.error("Error fetching leave requests:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

// Update leave request status
app.post("/update-leave-status", (req, res) => {
    const { id, status } = req.body;
    const sql = "UPDATE leave_request SET status = ? WHERE id = ?";

    connection.query(sql, [status, id], (err, result) => {
        if (err) {
            console.error("Error updating leave status:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ message: "Leave status updated successfully" });
    });
});


//ATTTENDANCE

// Clock In
router.post('/attendance/clock-in', async (req, res) => {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: 'Employee ID is required' });

    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            "INSERT INTO attendance (employee_id, clock_in_time, status) VALUES (?, NOW(), 'Present')",
            [employeeId]
        );
        connection.release();
        res.json({ success: true, message: 'Clocked in successfully', data: result });
    } catch (error) {
        console.error("Clock-in error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Clock Out
router.post('/attendance/clock-out', async (req, res) => {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: 'Employee ID is required' });

    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            "UPDATE attendance SET clock_out_time = NOW() WHERE employee_id = ? AND DATE(clock_in_time) = CURDATE()",
            [employeeId]
        );
        connection.release();
        res.json({ success: true, message: 'Clocked out successfully', data: result });
    } catch (error) {
        console.error("Clock-out error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get Attendance Records
router.get("/attendance/:employeeId", async (req, res) => {
    const { employeeId } = req.params;

    try {
        const connection = await pool.getConnection(); // Get a connection
        const [records] = await connection.query(
            "SELECT clock_in_time, clock_out_time, status FROM attendance WHERE employee_id = ? ORDER BY id DESC",
            [employeeId]
        );
        connection.release(); // Always release the connection
        res.json(records);
    } catch (error) {
        console.error("Fetch error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ✅ Start the server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});