import { prisma } from "../src/db.js";
import { generateExpectedOutput } from "../src/services/sqlRunner.js";

async function main() {
  console.log("🌱 Seeding SQL Assessment Database...");

  // 1. Create or ensure Default Admin
  await prisma.adminUser.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: "prof@2026",
      name: "Lead Database Professor",
    },
  });

  // 2. Create Assessment
  const assessment = await prisma.assessment.upsert({
    where: { code: "SQL101" },
    update: {},
    create: {
      title: "SQL Database Engineering & Query Assessment",
      description: "Comprehensive evaluation covering Window Functions, CTEs, Joins, Aggregations, and Edge Conditions.",
      code: "SQL101",
      durationMinutes: 60,
      shuffleQuestions: false,
      requireSeb: false,
      sebQuitPassword: "exit123",
      isReviewUnlocked: true,
    },
  });

  // Clean old questions for a clean seed
  await prisma.question.deleteMany({
    where: { assessmentId: assessment.id },
  });

  // -------------------------------------------------------------
  // Question 1: Second Highest Salary
  // -------------------------------------------------------------
  const q1Schema = `CREATE TABLE Employee (id INT PRIMARY KEY, salary INT);`;
  const q1Solution = `SELECT (SELECT DISTINCT salary FROM Employee ORDER BY salary DESC LIMIT 1 OFFSET 1) AS SecondHighestSalary;`;
  
  const q1Tc1Seed = `INSERT INTO Employee VALUES (1, 100), (2, 200), (3, 300);`;
  const q1Tc2Seed = `INSERT INTO Employee VALUES (1, 100);`;
  const q1Tc3Seed = `INSERT INTO Employee VALUES (1, 100), (2, 200), (3, 200);`;
  const q1Tc4Seed = `INSERT INTO Employee VALUES (1, 5000), (2, 7000), (3, 7000), (4, 4000), (5, 9000);`;

  await prisma.question.create({
    data: {
      assessmentId: assessment.id,
      title: "Second Highest Salary",
      description: `### Problem Statement:
Write a SQL query to find the second highest distinct salary from the \`Employee\` table. If there is no second highest salary, return \`NULL\`.

### Expected Column:
- \`SecondHighestSalary\`

### Table Schema:
\`\`\`sql
CREATE TABLE Employee (
  id INT PRIMARY KEY,
  salary INT
);
\`\`\`

### Example 1:
Given Employee table with salaries \`[100, 200, 300]\`, output should be:
| SecondHighestSalary |
|---------------------|
| 200                 |

### Example 2:
Given Employee table with salary \`[100]\`, output should be:
| SecondHighestSalary |
|---------------------|
| NULL                |`,
      difficulty: "EASY",
      marks: 10,
      schemaDdl: q1Schema,
      starterCode: `-- Write your SQL query below\nSELECT \n`,
      solutionSql: q1Solution,
      orderSensitive: false,
      explanation: "Use subquery with LIMIT 1 OFFSET 1 on DISTINCT salaries, wrapped in a SELECT to return NULL when fewer than 2 distinct salaries exist.",
      testCases: {
        create: [
          {
            title: "Sample Case: 3 Distinct Salaries",
            seedData: q1Tc1Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q1Schema, q1Tc1Seed, q1Solution)),
            isPublic: true,
            weight: 1.0,
            order: 0,
          },
          {
            title: "Edge Case: Single Employee (Expect NULL)",
            seedData: q1Tc2Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q1Schema, q1Tc2Seed, q1Solution)),
            isPublic: true,
            weight: 1.0,
            order: 1,
          },
          {
            title: "Edge Case: Duplicate Top Salaries",
            seedData: q1Tc3Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q1Schema, q1Tc3Seed, q1Solution)),
            isPublic: false,
            weight: 1.0,
            order: 2,
          },
          {
            title: "Benchmark Case: Multiple Records",
            seedData: q1Tc4Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q1Schema, q1Tc4Seed, q1Solution)),
            isPublic: false,
            weight: 1.0,
            order: 3,
          },
        ],
      },
    },
  });

  // -------------------------------------------------------------
  // Question 2: Department Top Three Salaries
  // -------------------------------------------------------------
  const q2Schema = `
    CREATE TABLE Department (id INT PRIMARY KEY, name VARCHAR(50));
    CREATE TABLE Employee (id INT PRIMARY KEY, name VARCHAR(50), salary INT, departmentId INT);
  `;
  const q2Solution = `
    WITH RankedSalaries AS (
      SELECT 
        d.name AS Department,
        e.name AS Employee,
        e.salary AS Salary,
        DENSE_RANK() OVER (PARTITION BY e.departmentId ORDER BY e.salary DESC) AS rnk
      FROM Employee e
      JOIN Department d ON e.departmentId = d.id
    )
    SELECT Department, Employee, Salary
    FROM RankedSalaries
    WHERE rnk <= 3
    ORDER BY Department ASC, Salary DESC, Employee ASC;
  `;

  const q2Tc1Seed = `
    INSERT INTO Department VALUES (1, 'IT'), (2, 'Sales');
    INSERT INTO Employee VALUES 
      (1, 'Joe', 85000, 1),
      (2, 'Henry', 80000, 2),
      (3, 'Sam', 60000, 2),
      (4, 'Max', 90000, 1),
      (5, 'Janet', 69000, 1),
      (6, 'Randy', 85000, 1),
      (7, 'Will', 70000, 1);
  `;

  const q2Tc2Seed = `
    INSERT INTO Department VALUES (1, 'Engineering');
    INSERT INTO Employee VALUES 
      (1, 'Alice', 95000, 1),
      (2, 'Bob', 95000, 1),
      (3, 'Charlie', 95000, 1),
      (4, 'David', 80000, 1);
  `;

  await prisma.question.create({
    data: {
      assessmentId: assessment.id,
      title: "Department Top Three Salaries",
      description: `### Problem Statement:
A high earner in a department is an employee who has a salary in the top three unique salaries for that department. Write a SQL query to find the employees who are high earners in each of the departments.

### Expected Output Columns:
- \`Department\` (Name of department)
- \`Employee\` (Name of employee)
- \`Salary\` (Employee salary)

### Ordering Requirement:
Order the result by \`Department\` ascending, then \`Salary\` descending, then \`Employee\` ascending.

### Schemas:
\`\`\`sql
CREATE TABLE Department (
  id INT PRIMARY KEY,
  name VARCHAR(50)
);

CREATE TABLE Employee (
  id INT PRIMARY KEY,
  name VARCHAR(50),
  salary INT,
  departmentId INT
);
\`\`\``,
      difficulty: "HARD",
      marks: 15,
      schemaDdl: q2Schema,
      starterCode: `-- Write your SQL query below using Window Functions\nWITH Ranked AS (\n  \n)\nSELECT \n`,
      solutionSql: q2Solution,
      orderSensitive: true,
      explanation: "Utilize DENSE_RANK() OVER (PARTITION BY departmentId ORDER BY salary DESC) to handle ties appropriately, then filter for rank <= 3.",
      testCases: {
        create: [
          {
            title: "Sample Case: Multiple Departments and Ties",
            seedData: q2Tc1Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q2Schema, q2Tc1Seed, q2Solution)),
            isPublic: true,
            weight: 1.0,
            order: 0,
          },
          {
            title: "Edge Case: All Equal Top Salaries (Tied Ranks)",
            seedData: q2Tc2Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q2Schema, q2Tc2Seed, q2Solution)),
            isPublic: false,
            weight: 1.0,
            order: 1,
          },
        ],
      },
    },
  });

  // -------------------------------------------------------------
  // Question 3: Customers Who Never Order
  // -------------------------------------------------------------
  const q3Schema = `
    CREATE TABLE Customers (id INT PRIMARY KEY, name VARCHAR(50));
    CREATE TABLE Orders (id INT PRIMARY KEY, customerId INT);
  `;
  const q3Solution = `
    SELECT c.name AS Customers
    FROM Customers c
    LEFT JOIN Orders o ON c.id = o.customerId
    WHERE o.id IS NULL
    ORDER BY c.name ASC;
  `;

  const q3Tc1Seed = `
    INSERT INTO Customers VALUES (1, 'Joe'), (2, 'Henry'), (3, 'Sam'), (4, 'Max');
    INSERT INTO Orders VALUES (1, 3), (2, 1);
  `;

  const q3Tc2Seed = `
    INSERT INTO Customers VALUES (1, 'Alice'), (2, 'Bob');
    INSERT INTO Orders VALUES (1, 1), (2, 2);
  `;

  await prisma.question.create({
    data: {
      assessmentId: assessment.id,
      title: "Customers Who Never Order",
      description: `### Problem Statement:
Write a SQL query to report all customers who never placed any orders in the \`Orders\` table.

### Expected Output Column:
- \`Customers\`

### Ordering:
Order results alphabetically by \`Customers\` ascending.

### Schemas:
\`\`\`sql
CREATE TABLE Customers (
  id INT PRIMARY KEY,
  name VARCHAR(50)
);

CREATE TABLE Orders (
  id INT PRIMARY KEY,
  customerId INT
);
\`\`\``,
      difficulty: "EASY",
      marks: 10,
      schemaDdl: q3Schema,
      starterCode: `-- Write your SQL query below\nSELECT \nFROM Customers c\n`,
      solutionSql: q3Solution,
      orderSensitive: true,
      explanation: "LEFT JOIN Customers with Orders and filter WHERE o.id IS NULL.",
      testCases: {
        create: [
          {
            title: "Sample Case: Some Customers with Orders",
            seedData: q3Tc1Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q3Schema, q3Tc1Seed, q3Solution)),
            isPublic: true,
            weight: 1.0,
            order: 0,
          },
          {
            title: "Edge Case: Every Customer Has Ordered (Empty Result)",
            seedData: q3Tc2Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q3Schema, q3Tc2Seed, q3Solution)),
            isPublic: false,
            weight: 1.0,
            order: 1,
          },
        ],
      },
    },
  });

  // -------------------------------------------------------------
  // Question 4: Consecutive Numbers
  // -------------------------------------------------------------
  const q4Schema = `CREATE TABLE Logs (id INT PRIMARY KEY, num INT);`;
  const q4Solution = `
    WITH LaggedLogs AS (
      SELECT 
        num,
        LAG(num, 1) OVER (ORDER BY id) AS prev1,
        LAG(num, 2) OVER (ORDER BY id) AS prev2
      FROM Logs
    )
    SELECT DISTINCT num AS ConsecutiveNums
    FROM LaggedLogs
    WHERE num = prev1 AND num = prev2;
  `;

  const q4Tc1Seed = `
    INSERT INTO Logs VALUES 
      (1, 1), (2, 1), (3, 1), 
      (4, 2), (5, 1), (6, 2), (7, 2);
  `;
  const q4Tc2Seed = `
    INSERT INTO Logs VALUES 
      (1, 3), (2, 3), (3, 4), (4, 4), (5, 5);
  `;

  await prisma.question.create({
    data: {
      assessmentId: assessment.id,
      title: "Consecutive Numbers",
      description: `### Problem Statement:
Find all numbers that appear at least three times consecutively in the \`Logs\` table.

### Expected Output Column:
- \`ConsecutiveNums\`

### Schemas:
\`\`\`sql
CREATE TABLE Logs (
  id INT PRIMARY KEY,
  num INT
);
\`\`\`

### Example:
For Logs:
\`[ (1, 1), (2, 1), (3, 1), (4, 2), (5, 1), (6, 2), (7, 2) ]\`
Output:
| ConsecutiveNums |
|-----------------|
| 1               |`,
      difficulty: "MEDIUM",
      marks: 15,
      schemaDdl: q4Schema,
      starterCode: `-- Write your SQL query below using Window Functions\nSELECT \n`,
      solutionSql: q4Solution,
      orderSensitive: false,
      explanation: "Use LAG(num, 1) and LAG(num, 2) ordered by id, then filter WHERE num = prev1 AND num = prev2.",
      testCases: {
        create: [
          {
            title: "Sample Case: Consecutive 1s",
            seedData: q4Tc1Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q4Schema, q4Tc1Seed, q4Solution)),
            isPublic: true,
            weight: 1.0,
            order: 0,
          },
          {
            title: "Edge Case: Max 2 Consecutive (Empty Result)",
            seedData: q4Tc2Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q4Schema, q4Tc2Seed, q4Solution)),
            isPublic: false,
            weight: 1.0,
            order: 1,
          },
        ],
      },
    },
  });

  // -------------------------------------------------------------
  // Question 5: Monthly Revenue & Cumulative Running Total
  // -------------------------------------------------------------
  const q5Schema = `
    CREATE TABLE Transactions (id INT PRIMARY KEY, order_date DATE, amount DECIMAL(10,2), status VARCHAR(20));
  `;
  const q5Solution = `
    WITH MonthlySummary AS (
      SELECT 
        strftime('%Y-%m', order_date) AS month,
        SUM(amount) AS monthly_revenue
      FROM Transactions
      WHERE status = 'COMPLETED'
      GROUP BY strftime('%Y-%m', order_date)
    )
    SELECT 
      month,
      monthly_revenue,
      SUM(monthly_revenue) OVER (ORDER BY month ASC) AS running_total
    FROM MonthlySummary
    ORDER BY month ASC;
  `;

  const q5Tc1Seed = `
    INSERT INTO Transactions VALUES 
      (1, '2026-01-10', 1200.00, 'COMPLETED'),
      (2, '2026-01-22', 800.00, 'COMPLETED'),
      (3, '2026-01-25', 500.00, 'CANCELLED'),
      (4, '2026-02-05', 2500.00, 'COMPLETED'),
      (5, '2026-03-12', 3100.00, 'COMPLETED');
  `;

  await prisma.question.create({
    data: {
      assessmentId: assessment.id,
      title: "Monthly Revenue & Cumulative Running Total",
      description: `### Problem Statement:
Calculate the total monthly revenue and the cumulative running total of revenue across months for completed orders. 

Filter strictly for transactions where \`status = 'COMPLETED'\`.

### Expected Output Columns:
- \`month\` (formatted as \`YYYY-MM\`)
- \`monthly_revenue\` (sum of amount in that month)
- \`running_total\` (cumulative revenue up to that month)

### Ordering:
Order the results chronologically by \`month\` ascending.

### Schema:
\`\`\`sql
CREATE TABLE Transactions (
  id INT PRIMARY KEY,
  order_date DATE,
  amount DECIMAL(10,2),
  status VARCHAR(20)
);
\`\`\``,
      difficulty: "MEDIUM",
      marks: 15,
      schemaDdl: q5Schema,
      starterCode: `-- Write your SQL query below\nWITH MonthlySummary AS (\n  \n)\nSELECT \n`,
      solutionSql: q5Solution,
      orderSensitive: true,
      explanation: "Group by strftime('%Y-%m', order_date) filtering for COMPLETED, then use SUM(monthly_revenue) OVER (ORDER BY month ASC).",
      testCases: {
        create: [
          {
            title: "Sample Case: Multi-Month Transactions with Status Filter",
            seedData: q5Tc1Seed,
            expectedOutput: JSON.stringify(generateExpectedOutput(q5Schema, q5Tc1Seed, q5Solution)),
            isPublic: true,
            weight: 1.0,
            order: 0,
          },
        ],
      },
    },
  });

  console.log("✅ Seed completed successfully! Assessment SQL101 ready with 5 problems.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
