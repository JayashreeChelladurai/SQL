import { prisma } from "../src/db.js";
import { generateExpectedOutput } from "../src/services/sqlRunner.js";

async function main() {
  console.log("🌱 Seeding 'sql1' Assessment with 3 Basic Queries...");

  // 1. Ensure Default Admin exists
  await prisma.adminUser.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: "prof@2026",
      name: "Lead Database Professor",
    },
  });

  // 2. Create or Upsert Assessment "sql1"
  const assessment = await prisma.assessment.upsert({
    where: { code: "SQL1" },
    update: {
      title: "sql1",
      description: "Basic SQL queries assessment covering SELECT, WHERE, ORDER BY, GROUP BY, and INNER JOIN.",
      durationMinutes: 45,
      shuffleQuestions: false,
      requireSeb: false,
      isReviewUnlocked: true,
    },
    create: {
      title: "sql1",
      description: "Basic SQL queries assessment covering SELECT, WHERE, ORDER BY, GROUP BY, and INNER JOIN.",
      code: "SQL1",
      durationMinutes: 45,
      shuffleQuestions: false,
      requireSeb: false,
      sebQuitPassword: "exit123",
      isReviewUnlocked: true,
    },
  });

  // Clean old questions for this assessment
  await prisma.question.deleteMany({
    where: { assessmentId: assessment.id },
  });

  // =========================================================================
  // Question 1: High Salary Employees (SELECT, WHERE, ORDER BY)
  // =========================================================================
  const q1Schema = `
    CREATE TABLE Employees (
      id INT PRIMARY KEY,
      name VARCHAR(50),
      department VARCHAR(50),
      salary INT
    );
  `;
  const q1Solution = `
    SELECT name, salary
    FROM Employees
    WHERE salary > 50000
    ORDER BY salary DESC, name ASC;
  `;

  const q1Tc1Seed = `
    INSERT INTO Employees VALUES
      (1, 'Alice', 'Engineering', 75000),
      (2, 'Bob', 'HR', 45000),
      (3, 'Charlie', 'Engineering', 60000),
      (4, 'Diana', 'Marketing', 52000),
      (5, 'Evan', 'Finance', 48000);
  `;

  const q1Tc2Seed = `
    INSERT INTO Employees VALUES
      (1, 'Frank', 'Sales', 50000),
      (2, 'Grace', 'Support', 35000),
      (3, 'Heidi', 'Legal', 50000);
  `;

  const q1Tc3Seed = `
    INSERT INTO Employees VALUES
      (1, 'Ivan', 'IT', 80000),
      (2, 'Judy', 'HR', 80000),
      (3, 'Kevin', 'IT', 95000),
      (4, 'Laura', 'Finance', 65000);
  `;

  await prisma.question.create({
    data: {
      assessmentId: assessment.id,
      title: "High Salary Employees",
      description: `### Problem Statement:
Write a SQL query to find all employees who earn a salary strictly greater than \`50,000\`.

### Expected Output Columns:
- \`name\` (Employee name)
- \`salary\` (Employee salary)

### Ordering Requirement:
Order the result by \`salary\` descending. If two employees have the same salary, order by \`name\` ascending.

### Table Schema:
\`\`\`sql
CREATE TABLE Employees (
  id INT PRIMARY KEY,
  name VARCHAR(50),
  department VARCHAR(50),
  salary INT
);
\`\`\`

### Example:
Given \`Employees\`:
| id | name    | department  | salary |
|----|---------|-------------|--------|
| 1  | Alice   | Engineering | 75000  |
| 2  | Bob     | HR          | 45000  |
| 3  | Charlie | Engineering | 60000  |

Output:
| name    | salary |
|---------|--------|
| Alice   | 75000  |
| Charlie | 60000  |`,
      difficulty: "EASY",
      marks: 10,
      order: 0,
      schemaDdl: q1Schema,
      starterCode: `-- Write your SQL query below\nSELECT name, salary\nFROM Employees\nWHERE \nORDER BY \n`,
      solutionSql: q1Solution,
      orderSensitive: true,
      explanation: "Use a WHERE filter 'salary > 50000' and ORDER BY salary DESC, name ASC.",
      testCases: {
        create: [
          {
            title: "Sample Case: Standard Employee Records",
            seedData: q1Tc1Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q1Schema, q1Tc1Seed, q1Solution)),
            isPublic: true,
            weight: 1.0,
            order: 0,
          },
          {
            title: "Edge Case: Boundary Values (Salary exactly 50000 excluded)",
            seedData: q1Tc2Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q1Schema, q1Tc2Seed, q1Solution)),
            isPublic: false,
            weight: 1.0,
            order: 1,
          },
          {
            title: "Benchmark Case: Equal Top Salaries Secondary Sort",
            seedData: q1Tc3Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q1Schema, q1Tc3Seed, q1Solution)),
            isPublic: false,
            weight: 1.0,
            order: 2,
          },
        ],
      },
    },
  });

  // =========================================================================
  // Question 2: Department Employee Count (GROUP BY, COUNT)
  // =========================================================================
  const q2Schema = `
    CREATE TABLE Employees (
      id INT PRIMARY KEY,
      name VARCHAR(50),
      department VARCHAR(50),
      salary INT
    );
  `;
  const q2Solution = `
    SELECT department, COUNT(*) AS employee_count
    FROM Employees
    GROUP BY department
    ORDER BY employee_count DESC, department ASC;
  `;

  const q2Tc1Seed = `
    INSERT INTO Employees VALUES
      (1, 'Alice', 'Engineering', 75000),
      (2, 'Bob', 'HR', 45000),
      (3, 'Charlie', 'Engineering', 60000),
      (4, 'Diana', 'Marketing', 52000),
      (5, 'Evan', 'Engineering', 68000),
      (6, 'Fiona', 'Marketing', 54000);
  `;

  const q2Tc2Seed = `
    INSERT INTO Employees VALUES
      (1, 'George', 'Finance', 90000),
      (2, 'Hannah', 'Finance', 85000);
  `;

  const q2Tc3Seed = `
    INSERT INTO Employees VALUES
      (1, 'Ian', 'Support', 40000),
      (2, 'Jane', 'Sales', 50000),
      (3, 'Kyle', 'Legal', 60000),
      (4, 'Lisa', 'Design', 55000);
  `;

  await prisma.question.create({
    data: {
      assessmentId: assessment.id,
      title: "Department Employee Count",
      description: `### Problem Statement:
Write a SQL query to count the total number of employees in each department.

### Expected Output Columns:
- \`department\` (Department name)
- \`employee_count\` (Total number of employees in that department)

### Ordering Requirement:
Order the results by \`employee_count\` in descending order. If two departments have the same number of employees, order alphabetically by \`department\` ascending.

### Table Schema:
\`\`\`sql
CREATE TABLE Employees (
  id INT PRIMARY KEY,
  name VARCHAR(50),
  department VARCHAR(50),
  salary INT
);
\`\`\`

### Example:
Given \`Employees\`:
| id | name    | department  | salary |
|----|---------|-------------|--------|
| 1  | Alice   | Engineering | 75000  |
| 2  | Bob     | HR          | 45000  |
| 3  | Charlie | Engineering | 60000  |

Output:
| department  | employee_count |
|-------------|----------------|
| Engineering | 2              |
| HR          | 1              |`,
      difficulty: "EASY",
      marks: 10,
      order: 1,
      schemaDdl: q2Schema,
      starterCode: `-- Write your SQL query below\nSELECT department, COUNT(*) AS employee_count\nFROM Employees\nGROUP BY department\nORDER BY \n`,
      solutionSql: q2Solution,
      orderSensitive: true,
      explanation: "Group rows by department and calculate COUNT(*) with alias employee_count, ordered by employee_count DESC, department ASC.",
      testCases: {
        create: [
          {
            title: "Sample Case: Multiple Departments with Varied Counts",
            seedData: q2Tc1Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q2Schema, q2Tc1Seed, q2Solution)),
            isPublic: true,
            weight: 1.0,
            order: 0,
          },
          {
            title: "Edge Case: Single Department",
            seedData: q2Tc2Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q2Schema, q2Tc2Seed, q2Solution)),
            isPublic: false,
            weight: 1.0,
            order: 1,
          },
          {
            title: "Benchmark Case: Equal Department Sizes Tie-Breaker",
            seedData: q2Tc3Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q2Schema, q2Tc3Seed, q2Solution)),
            isPublic: false,
            weight: 1.0,
            order: 2,
          },
        ],
      },
    },
  });

  // =========================================================================
  // Question 3: Customers and Order Amounts (INNER JOIN)
  // =========================================================================
  const q3Schema = `
    CREATE TABLE Customers (
      id INT PRIMARY KEY,
      name VARCHAR(50),
      email VARCHAR(50)
    );

    CREATE TABLE Orders (
      id INT PRIMARY KEY,
      customer_id INT,
      amount DECIMAL(10,2),
      order_date DATE
    );
  `;
  const q3Solution = `
    SELECT c.name AS customer_name, o.amount AS order_amount
    FROM Customers c
    JOIN Orders o ON c.id = o.customer_id
    ORDER BY c.name ASC, o.amount DESC;
  `;

  const q3Tc1Seed = `
    INSERT INTO Customers VALUES
      (1, 'Alice', 'alice@test.com'),
      (2, 'Bob', 'bob@test.com'),
      (3, 'Carol', 'carol@test.com');

    INSERT INTO Orders VALUES
      (101, 1, 150.00, '2026-01-15'),
      (102, 1, 200.00, '2026-02-10'),
      (103, 2, 85.50, '2026-02-12');
  `;

  const q3Tc2Seed = `
    INSERT INTO Customers VALUES
      (1, 'Dave', 'dave@test.com'),
      (2, 'Emma', 'emma@test.com');
  `;

  const q3Tc3Seed = `
    INSERT INTO Customers VALUES
      (1, 'Xavier', 'x@test.com'),
      (2, 'Yvonne', 'y@test.com'),
      (3, 'Zack', 'z@test.com');

    INSERT INTO Orders VALUES
      (201, 3, 500.00, '2026-03-01'),
      (202, 2, 350.00, '2026-03-02'),
      (203, 1, 120.00, '2026-03-03'),
      (204, 2, 90.00, '2026-03-04');
  `;

  await prisma.question.create({
    data: {
      assessmentId: assessment.id,
      title: "Customers and Order Amounts",
      description: `### Problem Statement:
Write a SQL query to list all customer orders by joining the \`Customers\` and \`Orders\` tables.

Return each customer's name alongside their individual order amount. Only include customers who have placed an order.

### Expected Output Columns:
- \`customer_name\` (Customer name from Customers table)
- \`order_amount\` (Order amount from Orders table)

### Ordering Requirement:
Order results alphabetically by \`customer_name\` ascending, then by \`order_amount\` descending.

### Tables Schema:
\`\`\`sql
CREATE TABLE Customers (
  id INT PRIMARY KEY,
  name VARCHAR(50),
  email VARCHAR(50)
);

CREATE TABLE Orders (
  id INT PRIMARY KEY,
  customer_id INT,
  amount DECIMAL(10,2),
  order_date DATE
);
\`\`\`

### Example:
Given \`Customers\`:
| id | name  | email          |
|----|-------|----------------|
| 1  | Alice | alice@test.com |
| 2  | Bob   | bob@test.com   |
| 3  | Carol | carol@test.com |

Given \`Orders\`:
| id  | customer_id | amount | order_date |
|-----|-------------|--------|------------|
| 101 | 1           | 150.00 | 2026-01-15 |
| 102 | 1           | 200.00 | 2026-02-10 |
| 103 | 2           | 85.50  | 2026-02-12 |

Output:
| customer_name | order_amount |
|---------------|--------------|
| Alice         | 200.0        |
| Alice         | 150.0        |
| Bob           | 85.5         |
*(Carol has no orders, so Carol is excluded)*`,
      difficulty: "EASY",
      marks: 10,
      order: 2,
      schemaDdl: q3Schema,
      starterCode: `-- Write your SQL query below using INNER JOIN\nSELECT c.name AS customer_name, o.amount AS order_amount\nFROM Customers c\nJOIN Orders o ON \nORDER BY \n`,
      solutionSql: q3Solution,
      orderSensitive: true,
      explanation: "INNER JOIN Customers c and Orders o on c.id = o.customer_id, alias columns customer_name and order_amount, order by c.name ASC, o.amount DESC.",
      testCases: {
        create: [
          {
            title: "Sample Case: Joined Customers with Multiple Orders",
            seedData: q3Tc1Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q3Schema, q3Tc1Seed, q3Solution)),
            isPublic: true,
            weight: 1.0,
            order: 0,
          },
          {
            title: "Edge Case: Zero Orders Placed (Empty Table Expected)",
            seedData: q3Tc2Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q3Schema, q3Tc2Seed, q3Solution)),
            isPublic: false,
            weight: 1.0,
            order: 1,
          },
          {
            title: "Benchmark Case: Multiple Customers with Mixed Orders",
            seedData: q3Tc3Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q3Schema, q3Tc3Seed, q3Solution)),
            isPublic: false,
            weight: 1.0,
            order: 2,
          },
        ],
      },
    },
  });

  console.log("✅ Seed completed! Assessment 'sql1' (Code: SQL1) created with 3 basic queries.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
