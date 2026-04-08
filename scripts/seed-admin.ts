/**
 * Migrate the admin tables (employees, projects, minutes) from the
 * legacy JSON files to d6e. Existing UUIDs are preserved so that
 * cross-references (project.assignedEmployeeIds → employee.id) survive.
 *
 * Idempotent: existing rows (by id) are skipped.
 *
 * Run with:
 *   pnpm exec tsx --conditions=react-server --env-file=.env scripts/seed-admin.ts
 */

import employeesData from "../data/employees.json";
import projectsData from "../data/projects.json";
import minutesData from "../data/minutes.json";

import { executeSql } from "../lib/d6e/client";
import { escapeSqlValue, tableRef } from "../lib/d6e/sql";
import type { Employee, KPI, CompanyAssignment } from "../lib/employees";
import type { Project } from "../lib/projects";
import type { MeetingMinute } from "../lib/minutes";

interface CountRow {
  n: number;
}

async function tableHasId(table: string, id: string): Promise<boolean> {
  const result = await executeSql<CountRow>(
    `SELECT count(*)::int as n FROM ${tableRef(table)} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.rows?.[0]?.n ?? 0) > 0;
}

async function seedEmployees(): Promise<void> {
  const employees = employeesData as Array<
    Employee & { kpis?: KPI[]; assignments?: CompanyAssignment[] }
  >;
  console.log(`\n📥  employees: ${employees.length} entries`);

  for (const emp of employees) {
    if (await tableHasId("employees", emp.id)) {
      console.log(`  ⏭  skip ${emp.name} (${emp.id})`);
      continue;
    }

    // Core employee row — preserve original UUID.
    await executeSql(
      `INSERT INTO ${tableRef("employees")} (id, name, email, department, title, phone)
       VALUES (
         ${escapeSqlValue(emp.id)},
         ${escapeSqlValue(emp.name)},
         ${escapeSqlValue(emp.email)},
         ${escapeSqlValue(emp.department)},
         ${escapeSqlValue(emp.position)},
         ${escapeSqlValue(emp.phone)}
       )`,
    );

    // Assignments
    for (const a of emp.assignments ?? []) {
      await executeSql(
        `INSERT INTO ${tableRef("employee_assignments")}
           (id, employee_id, company_code, company_name, role, status, note, assigned_at)
         VALUES (
           ${escapeSqlValue(crypto.randomUUID())},
           ${escapeSqlValue(emp.id)},
           ${escapeSqlValue(a.companyCode)},
           ${escapeSqlValue(a.companyName)},
           ${escapeSqlValue(a.role)},
           ${escapeSqlValue(a.status)},
           ${escapeSqlValue(a.note)},
           ${escapeSqlValue(a.assignedAt)}
         )`,
      );
    }

    // KPIs (may be missing from legacy records)
    for (const k of emp.kpis ?? []) {
      await executeSql(
        `INSERT INTO ${tableRef("employee_kpis")}
           (id, employee_id, period, metric, target, actual, unit, note, updated_at)
         VALUES (
           ${escapeSqlValue(k.id)},
           ${escapeSqlValue(emp.id)},
           ${escapeSqlValue(k.period)},
           ${escapeSqlValue(k.metric)},
           ${escapeSqlValue(k.target)},
           ${escapeSqlValue(k.actual)},
           ${escapeSqlValue(k.unit)},
           ${escapeSqlValue(k.note)},
           ${escapeSqlValue(k.updatedAt)}
         )`,
      );
    }

    console.log(
      `  ✅  ${emp.name}  (${emp.assignments?.length ?? 0} assignments, ${emp.kpis?.length ?? 0} kpis)`,
    );
  }
}

async function seedProjects(): Promise<void> {
  const projects = projectsData as Project[];
  console.log(`\n📥  projects: ${projects.length} entries`);

  for (const p of projects) {
    if (await tableHasId("projects", p.id)) {
      console.log(`  ⏭  skip ${p.name} (${p.id})`);
      continue;
    }

    // seller_id may reference a seller that hasn't been migrated yet.
    // Set NULL during seed; the user can re-link manually after sellers
    // are migrated in a later phase.
    await executeSql(
      `INSERT INTO ${tableRef("projects")}
         (id, name, description, status, priority, related_companies, start_date, target_date, seller_id)
       VALUES (
         ${escapeSqlValue(p.id)},
         ${escapeSqlValue(p.name)},
         ${escapeSqlValue(p.description)},
         ${escapeSqlValue(p.status)},
         ${escapeSqlValue(p.priority)},
         ${escapeSqlValue(p.relatedCompanies, "jsonb")},
         ${p.startDate ? escapeSqlValue(p.startDate) : "NULL"},
         ${p.targetDate ? escapeSqlValue(p.targetDate) : "NULL"},
         NULL
       )`,
    );

    // assignedEmployeeIds → project_assignees rows
    for (const eid of p.assignedEmployeeIds) {
      try {
        await executeSql(
          `INSERT INTO ${tableRef("project_assignees")} (project_id, employee_id) VALUES (${escapeSqlValue(p.id)}, ${escapeSqlValue(eid)})`,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(
          `    ⚠  assignee FK skipped: ${eid}  ${msg.slice(0, 80)}`,
        );
      }
    }

    if (p.sellerId) {
      console.log(
        `  ✅  ${p.name}  (seller_id ${p.sellerId} stored as NULL — sellers not yet migrated)`,
      );
    } else {
      console.log(`  ✅  ${p.name}`);
    }
  }
}

async function seedMinutes(): Promise<void> {
  const minutes = minutesData as MeetingMinute[];
  console.log(`\n📥  minutes: ${minutes.length} entries`);

  for (const m of minutes) {
    if (await tableHasId("meeting_minutes", m.id)) {
      console.log(`  ⏭  skip ${m.title} (${m.id})`);
      continue;
    }
    await executeSql(
      `INSERT INTO ${tableRef("meeting_minutes")}
         (id, title, meeting_date, attendees, project_id, content, decisions, action_items)
       VALUES (
         ${escapeSqlValue(m.id)},
         ${escapeSqlValue(m.title)},
         ${escapeSqlValue(m.date)},
         ${escapeSqlValue(m.participants, "ARRAY", "_text")},
         ${m.projectId ? escapeSqlValue(m.projectId) : "NULL"},
         ${escapeSqlValue(m.content)},
         ${escapeSqlValue(m.decisions, "jsonb")},
         ${escapeSqlValue(m.actionItems, "jsonb")}
       )`,
    );
    console.log(`  ✅  ${m.title}`);
  }
}

async function main(): Promise<void> {
  await seedEmployees();
  await seedProjects();
  await seedMinutes();

  console.log("\n=== final counts ===");
  for (const t of [
    "employees",
    "employee_assignments",
    "employee_kpis",
    "projects",
    "project_assignees",
    "meeting_minutes",
  ]) {
    const r = await executeSql<CountRow>(
      `SELECT count(*)::int as n FROM ${tableRef(t)}`,
    );
    console.log(`  ${t.padEnd(22)} ${r.rows?.[0]?.n ?? "?"}`);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
