CREATE DATABASE workforce360;
USE workforce360;

-- Create table template for employees
CREATE TABLE employees_template (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    address TEXT,
    employeeID VARCHAR(50),
    password VARCHAR(255),
    email VARCHAR(100),
    phone VARCHAR(20),
    department VARCHAR(100),
    role VARCHAR(100),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
;

-- Create table for HR
CREATE TABLE HR (
    HR_ID INT AUTO_INCREMENT PRIMARY KEY,
    password VARCHAR(255),
    name VARCHAR(255),
    email VARCHAR(255)
);

CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50),
    clock_in_time DATETIME,
    clock_out_time DATETIME,
    date DATE,
    status ENUM('Present', 'Late', 'Absent') DEFAULT 'Absent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leave_request (
    id int AUTO_INCREMENT PRIMARY KEY,
    employeeID VARCHAR(50),
    leave_type ENUM('Sick leave','Paid leave','Maternity leave','Casual leave','Paternity leave','Compensatory leave','Unpaid leave'),
    start_date DATE,
    end_date DATE,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    reason TEXT
);