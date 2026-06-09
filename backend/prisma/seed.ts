import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Check if data already exists — if so, skip seeding entirely to preserve user data
  const existingUserCount = await prisma.user.count();
  if (existingUserCount > 0) {
    console.log(`Database already has ${existingUserCount} user(s). Skipping seed to preserve existing data.`);
    return;
  }

  console.log('Empty database detected. Running initial seed...');

  // 2. Create default users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@zyra.local',
      firstName: 'Alex',
      lastName: 'Admin',
      passwordHash: adminPassword,
      avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex',
    },
  });

  const developer = await prisma.user.create({
    data: {
      email: 'dev@zyra.local',
      firstName: 'Devin',
      lastName: 'Developer',
      passwordHash: userPassword,
      avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Devin',
    },
  });

  console.log('Users seeded successfully');

  // 3. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Default Workspace',
      slug: 'default-workspace',
    },
  });

  // Assign memberships
  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: admin.id, role: 'ADMIN' },
      { workspaceId: workspace.id, userId: developer.id, role: 'MEMBER' },
    ],
  });

  console.log('Workspace seeded successfully');

  // 4. Create Project
  const project = await prisma.project.create({
    data: {
      name: 'Phoenix System',
      key: 'PHX',
      description: 'The core platform integration project.',
      workspaceId: workspace.id,
      leadId: admin.id,
    },
  });

  // Create default workflow for seeded project
  const wf = await prisma.workflow.create({
    data: {
      name: 'Phoenix System Workflow',
      description: 'Default workflow for project Phoenix System',
      projectId: project.id,
      isDefault: true,
      states: {
        create: [
          { name: 'To Do', category: 'TODO', color: '#6B7280', position: 0 },
          { name: 'In Progress', category: 'IN_PROGRESS', color: '#3B82F6', position: 1 },
          { name: 'In Review', category: 'IN_PROGRESS', color: '#F59E0B', position: 2 },
          { name: 'Done', category: 'DONE', color: '#10B981', position: 3 },
        ]
      }
    },
    include: { states: true }
  });

  // Assign workspace member project access for ADMIN / MEMBER roles ( Alex & Devin )
  const adminWsMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId: workspace.id, userId: admin.id }
  });
  const developerWsMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId: workspace.id, userId: developer.id }
  });

  if (adminWsMember) {
    await prisma.workspaceMemberProject.create({
      data: { workspaceMemberId: adminWsMember.id, projectId: project.id }
    });
  }
  if (developerWsMember) {
    await prisma.workspaceMemberProject.create({
      data: { workspaceMemberId: developerWsMember.id, projectId: project.id }
    });
  }

  console.log('Project seeded successfully');

  // 5. Create Board
  const board = await prisma.board.create({
    data: {
      name: 'PHX Kanban Board',
      type: 'KANBAN',
      projectId: project.id,
    },
  });

  // Helper to resolve seeded workflow state ID
  const getWfStateId = (name: string) => wf.states.find(s => s.name === name)?.id || null;

  // 6. Create Board Columns (Workflow statuses)
  const todoCol = await prisma.boardColumn.create({
    data: { name: 'To Do', position: 0, boardId: board.id, workflowStateId: getWfStateId('To Do') },
  });
  const inProgressCol = await prisma.boardColumn.create({
    data: { name: 'In Progress', position: 1, boardId: board.id, workflowStateId: getWfStateId('In Progress') },
  });
  const inReviewCol = await prisma.boardColumn.create({
    data: { name: 'In Review', position: 2, boardId: board.id, workflowStateId: getWfStateId('In Review') },
  });
  const doneCol = await prisma.boardColumn.create({
    data: { name: 'Done', position: 3, boardId: board.id, workflowStateId: getWfStateId('Done') },
  });

  console.log('Columns seeded successfully');

  // 7. Create Sprint
  const sprint = await prisma.sprint.create({
    data: {
      name: 'PHX Sprint 1',
      goal: 'Complete docker integration and environment configurations.',
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      status: 'ACTIVE',
      projectId: project.id,
    },
  });

  console.log('Sprint seeded successfully');

  // 8. Create Issues
  await prisma.issue.create({
    data: {
      key: 'PHX-1',
      summary: 'Design database schema and monorepo structure',
      description: '<h2>Scope</h2><p>Define database structures using Prisma schemas and outline monorepo docker architecture.</p>',
      statusId: doneCol.id,
      priority: 'HIGHEST',
      type: 'STORY',
      storyPoints: 5,
      projectId: project.id,
      sprintId: sprint.id,
      reporterId: admin.id,
      assigneeId: admin.id,
    },
  });

  const issue2 = await prisma.issue.create({
    data: {
      key: 'PHX-2',
      summary: 'Implement authentication & authorization system',
      description: '<h3>Goal</h3><p>Establish JWT access token and refresh token rotation processes.</p>',
      statusId: inProgressCol.id,
      priority: 'HIGH',
      type: 'TASK',
      storyPoints: 3,
      projectId: project.id,
      sprintId: sprint.id,
      reporterId: admin.id,
      assigneeId: developer.id,
    },
  });

  await prisma.issue.create({
    data: {
      key: 'PHX-3',
      summary: 'Build Jira CSV upload/parse wizard component',
      description: '<p>Construct columns matching UI for smart fuzzy header detection.</p>',
      statusId: todoCol.id,
      priority: 'MEDIUM',
      type: 'STORY',
      storyPoints: 8,
      projectId: project.id,
      sprintId: sprint.id,
      reporterId: developer.id,
      assigneeId: developer.id,
    },
  });

  await prisma.issue.create({
    data: {
      key: 'PHX-4',
      summary: 'Fix Vite HMR file watcher polling bug inside Docker',
      description: '<p>Hot reload requires watch poll configurations under WSL mounts.</p>',
      statusId: inReviewCol.id,
      priority: 'LOW',
      type: 'BUG',
      storyPoints: 1,
      projectId: project.id,
      sprintId: sprint.id,
      reporterId: developer.id,
      assigneeId: admin.id,
    },
  });

  console.log('Issues seeded successfully');

  // 9. Add Comments
  await prisma.comment.create({
    data: {
      issueId: issue2.id,
      authorId: admin.id,
      body: '<p>Devin, make sure we use secure cookie storage for refresh tokens.</p>',
    },
  });

  await prisma.comment.create({
    data: {
      issueId: issue2.id,
      authorId: developer.id,
      body: '<p>Understood. I will write the helper services for HTTP-only cookies.</p>',
    },
  });

  console.log('Comments seeded successfully');

  // 10. Audit logs & activities
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'WORKSPACE_CREATE',
      details: JSON.stringify({ workspaceName: workspace.name }),
    },
  });

  await prisma.activity.create({
    data: {
      issueId: issue2.id,
      userId: admin.id,
      action: 'UPDATE_STATUS',
      details: JSON.stringify({ from: 'To Do', to: 'In Progress' }),
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
