import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const permissionDefinitions = [
  ["MANAGE_USERS", "Create, suspend, and manage user accounts."],
  ["MANAGE_ROLES", "Assign and manage platform roles."],
  ["MANAGE_COURSES", "Create and publish learning programs."],
  ["MANAGE_BATCHES", "Manage course batches and availability."],
  ["MANAGE_APPLICATIONS", "Review and update learner applications."],
  ["MANAGE_ENROLLMENTS", "Manage learner enrollments."],
  ["MANAGE_ASSIGNMENTS", "Create assignments and review submissions."],
  ["MANAGE_RESOURCES", "Upload and manage protected learning resources."],
  ["MANAGE_SESSIONS", "Schedule and manage learning sessions."],
  ["MANAGE_COMMUNITY", "Create channels and manage membership."],
  ["MODERATE_COMMUNITY", "Review reports and moderate community content."],
  ["MANAGE_APPOINTMENTS", "Manage availability and appointments."],
  ["MANAGE_TESTIMONIALS", "Review and publish consented testimonials."],
  ["MANAGE_MENTORS", "Manage mentor profiles and assignments."],
  ["MANAGE_EVENTS", "Create and manage events."],
  ["MANAGE_ANNOUNCEMENTS", "Publish announcements."],
  ["MANAGE_ADVERTISEMENTS", "Manage approved spotlight and promotional content."],
  ["MANAGE_SITE_CONTENT", "Edit site content, navigation, and service endpoints."],
  ["VIEW_ANALYTICS", "View database-backed platform analytics."],
  ["VIEW_AUDIT_LOGS", "Review administrative and security audit records."],
  ["MANAGE_EMAIL_TEMPLATES", "Edit transactional email templates."],
  ["MANAGE_ASTRA_SETTINGS", "Configure the Astra assistant and allowed tools."],
  ["MANAGE_SETTINGS", "Manage platform settings and integrations."],
] as const;

const adminPermissions = permissionDefinitions.map(([code]) => code);
const mentorPermissions = ["MANAGE_ASSIGNMENTS", "MANAGE_RESOURCES", "MANAGE_SESSIONS", "MANAGE_APPOINTMENTS"];

const homeSections = [
  { key: "hero", type: "hero", title: "Come closer to the life you can build.", eyebrow: "THE ASRVONE ACADEMY", subtitle: "Learn. Code. Grow. Succeed.", body: "A question can change the direction of a life. Here, yours has room to become a skill, a craft, a future.", ctaText: "Begin your registration", ctaUrl: "#registration", sortOrder: 0 },
  { key: "story", type: "story", title: "Somewhere between who you are and who you might become, there is a question worth following.", eyebrow: "A NOTE TO THE CURIOUS", body: "ASRVOne is a learning and mentorship community for people who want their effort to mean something.", sortOrder: 1 },
  { key: "journey", type: "journey", title: "A learning journey in motion", eyebrow: "THE WAY FORWARD", body: "Discover, learn, code, connect, grow, and succeed through a journey shaped by your questions.", sortOrder: 2 },
  { key: "academy", type: "approach", title: "A good idea deserves to be made real.", eyebrow: "KNOWLEDGE, WITH ITS SLEEVES ROLLED UP", body: "We learn by asking why, putting the answer into practice, and making space for the next question.", sortOrder: 3 },
  { key: "program", type: "program", title: "One to LeetCode", eyebrow: "JAVA + DSA PLACEMENT PREPARATION", body: "A journey from Java foundations to the calm, clear thinking that a difficult problem asks of you.", ctaText: "Join the next chapter", ctaUrl: "#registration", sortOrder: 4 },
  { key: "practice", type: "practice", title: "An idea becomes yours when you work it out.", eyebrow: "A MOMENT WITH THE MATERIAL", sortOrder: 5 },
  { key: "values", type: "values", title: "Five ways to keep becoming.", eyebrow: "A NAME WE TRY TO LIVE UP TO", body: "Active, Shine, Rise, Vision, One.", sortOrder: 6 },
  { key: "services", type: "services", title: "One vision. Many ways forward.", eyebrow: "THE ASRVONE ECOSYSTEM", body: "Choose a door into the learning, practice, community, resources, and guidance ASRVOne offers.", sortOrder: 7 },
  { key: "finder", type: "finder", title: "Every beginning has its own door.", eyebrow: "WHERE ARE YOU IN THE STORY?", sortOrder: 8 },
  { key: "founder", type: "founder", title: "I G Siva Shankar", eyebrow: "FOUNDER & MENTOR", body: "A syllabus can show what to study. Good mentorship helps you see what you might become.", sortOrder: 9 },
  { key: "registration", type: "registration", title: "Every journey begins with your name.", eyebrow: "YOUR NEXT CHAPTER", sortOrder: 10 },
  { key: "closing", type: "cta", title: "The next line is yours.", eyebrow: "WHEN YOU ARE READY, THE DOOR IS HERE", ctaText: "Register your interest", ctaUrl: "#registration", sortOrder: 11 },
];

const services = [
  { key: "learning", name: "ASRVOne Learning", description: "Learn concepts with clarity, then make them your own through deliberate practice.", endpoint: "/learn", ctaText: "Explore learning", status: "ACTIVE", sortOrder: 0 },
  { key: "codelab", name: "ASRVOne CodeLab", description: "Try a focused Java problem and follow the reasoning behind its solution.", endpoint: "https://asrvone-codelab.vercel.app", ctaText: "Open CodeLab", status: "ACTIVE", sortOrder: 1 },
  { key: "community", name: "ASRVOne Community", description: "Ask without hesitation, learn without ego, and help others when you can.", endpoint: "/community", ctaText: "Enter the community", status: "ACTIVE", sortOrder: 2 },
  { key: "live", name: "ASRVOne Live", description: "Find scheduled sessions and class details for your enrolled batch.", endpoint: "/live", ctaText: "View sessions", status: "ACTIVE", sortOrder: 3 },
  { key: "resources", name: "ASRVOne Resources", description: "Access learning material shared with your course and batch.", endpoint: "/resources", ctaText: "Open resources", status: "ACTIVE", sortOrder: 4 },
  { key: "events", name: "ASRVOne Events", description: "See upcoming learning and community events published by ASRVOne.", endpoint: "/events", ctaText: "Explore events", status: "ACTIVE", sortOrder: 5 },
  { key: "astra", name: "ASRVOne Astra", description: "Ask Astra about published learning paths, sessions, and resources.", endpoint: "/astra", ctaText: "Talk with Astra", status: "ACTIVE", sortOrder: 6 },
] as const;

const modules = [
  { title: "Java Fundamentals", description: "Programming foundations, the JDK, JRE and JVM, data types, operators, input, and control flow." },
  { title: "Logic Building", description: "Conditionals, loops, methods, patterns, and the habit of tracing a solution before coding." },
  { title: "Core Java & Object-Oriented Programming", description: "Classes, objects, constructors, encapsulation, inheritance, polymorphism, interfaces, and exceptions." },
  { title: "Arrays & Strings", description: "Traversal, searching, sorting, character frequency, palindrome, anagram, and substring practice." },
  { title: "Data Structures & Algorithms", description: "Problem solving across data structures, algorithms, complexity, and LeetCode-style questions." },
  { title: "Placement Preparation", description: "Technical interviews, core computer science, project explanations, resume readiness, and communication." },
];

async function seed() {
  const roles = [
    { code: "ADMIN" as const, name: "Administrator", description: "Full platform control." },
    { code: "MENTOR" as const, name: "Mentor", description: "Teaching and assigned learner support." },
    { code: "STUDENT" as const, name: "Student", description: "Learning and enrolled service access." },
  ];
  for (const role of roles) await db.role.upsert({ where: { code: role.code }, create: role, update: { name: role.name, description: role.description } });
  for (const [code, description] of permissionDefinitions) await db.permission.upsert({ where: { code }, create: { code, description }, update: { description } });

  for (const code of adminPermissions) {
    const role = await db.role.findUniqueOrThrow({ where: { code: "ADMIN" } });
    const permission = await db.permission.findUniqueOrThrow({ where: { code } });
    await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, create: { roleId: role.id, permissionId: permission.id }, update: {} });
  }
  for (const code of mentorPermissions) {
    const role = await db.role.findUniqueOrThrow({ where: { code: "MENTOR" } });
    const permission = await db.permission.findUniqueOrThrow({ where: { code } });
    await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, create: { roleId: role.id, permissionId: permission.id }, update: {} });
  }

  for (const section of homeSections) {
    const { sortOrder, ...content } = section;
    await db.homePageSection.upsert({
      where: { key: section.key },
      create: { ...content, sortOrder, visible: true, status: "PUBLISHED", publishedAt: new Date() },
      update: { ...content, visible: true, status: "PUBLISHED", sortOrder },
    });
  }
  for (const service of services) {
    const { sortOrder, ...content } = service;
    await db.serviceEndpoint.upsert({ where: { key: service.key }, create: { ...content, sortOrder }, update: { ...content, sortOrder } });
  }

  const course = await db.course.upsert({
    where: { slug: "one-to-leetcode" },
    create: {
      slug: "one-to-leetcode",
      title: "Java + DSA Placement Batch — One to LeetCode",
      summary: "Java fundamentals, deliberate problem solving, data structures, algorithms, and placement preparation.",
      description: "A guided learning path from Java foundations toward clear problem-solving, DSA practice, and placement readiness. Batch dates and availability are set by ASRVOne administrators.",
      level: "Foundations to placement preparation",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    update: { status: "PUBLISHED", publishedAt: new Date() },
  });
  for (let index = 0; index < modules.length; index += 1) {
    const module = modules[index];
    await db.courseModule.upsert({
      where: { courseId_sortOrder: { courseId: course.id, sortOrder: index + 1 } },
      create: { courseId: course.id, title: module.title, description: module.description, sortOrder: index + 1 },
      update: { title: module.title, description: module.description },
    });
  }
  const logicModule = await db.courseModule.findUniqueOrThrow({ where: { courseId_sortOrder: { courseId: course.id, sortOrder: 2 } } });
  await db.assignment.upsert({
    where: { id: "a2cf4b5c-94e0-4c7d-a1fc-5e0beaca508d" },
    create: { id: "a2cf4b5c-94e0-4c7d-a1fc-5e0beaca508d", courseId: course.id, moduleId: logicModule.id, title: "Conditional Statements & Loops Practice", instructions: "Complete 15 if/else problems, 10 loop problems, and 5 pattern-printing problems. Explain the condition or loop boundary you chose for each solution.", published: true },
    update: { courseId: course.id, moduleId: logicModule.id, published: true },
  });

  const emailTemplates = [
    { key: "verify_email", subject: "Verify your ASRVOne account", preheader: "One quick step before your learning journey begins.", body: "Hello {{name}},\n\nFollow this link to verify your email and activate your ASRVOne account:\n{{link}}\n\nIf you did not request this account, you can ignore this message.\n\nASRVOne — Learn. Code. Grow. Succeed.", variables: ["name", "link"] },
    { key: "reset_password", subject: "Reset your ASRVOne password", preheader: "Choose a new password for your account.", body: "Hello {{name}},\n\nUse this one-time link to choose a new password:\n{{link}}\n\nThe link expires in one hour. If you did not request a reset, ignore this message.\n\nASRVOne Support", variables: ["name", "link"] },
    { key: "application_received_admin", subject: "New ASRVOne learning application", preheader: "A learner has sent an application.", body: "{{name}} ({{email}}) submitted an application for {{program}}.\n\nApplication ID: {{applicationId}}", variables: ["name", "email", "program", "applicationId"] },
    { key: "application_received_student", subject: "Your note found its way to ASRVOne", preheader: "A thank-you, and what happens next.", body: "Hello {{name}},\n\nThank you for placing your learning hopes in our hands. Your registration for {{program}} is safely with ASRVOne.\n\nReference: {{applicationId}}\nWe expect to respond {{responseWindow}}.\n\nEvery good beginning is a small act of courage. We’re glad yours led here.\n\nASRVOne — Learn. Code. Grow. Succeed.", variables: ["name", "program", "applicationId", "responseWindow"] },
    { key: "application_status", subject: "Your ASRVOne application has moved", preheader: "An update from your learning team.", body: "Hello {{name}},\n\nYour application for {{course}} is now {{status}}.\n\n{{note}}\n\nIf you have a learner account, your learning space will show the latest details.\n\nASRVOne — Learn. Code. Grow. Succeed.", variables: ["name", "course", "status", "note"] },
    { key: "appointment_confirmed", subject: "Your ASRVOne appointment is confirmed", preheader: "Your mentorship conversation is on the calendar.", body: "Hello {{name}},\n\nYour appointment is confirmed for {{startsAt}}.\n{{meetUrl}}\n\nASRVOne", variables: ["name", "startsAt", "meetUrl"] },
    { key: "session_reminder", subject: "A learning session is coming up", preheader: "Your next ASRVOne session details.", body: "Hello {{name}},\n\n{{sessionTitle}} begins at {{startsAt}}.\n{{meetUrl}}\n\nASRVOne", variables: ["name", "sessionTitle", "startsAt", "meetUrl"] },
  ];
  for (const template of emailTemplates) await db.emailTemplate.upsert({ where: { key: template.key }, create: template, update: { subject: template.subject, preheader: template.preheader, body: template.body, variables: template.variables } });

  const social = ["Instagram", "WhatsApp", "Discord", "LinkedIn", "YouTube", "GitHub"];
  for (let index = 0; index < social.length; index += 1) {
    const platform = social[index];
    await db.socialLink.upsert({ where: { platform }, create: { platform, label: platform, visible: false, sortOrder: index }, update: {} });
  }
  const navigation = [
    { label: "Our story", href: "#story", sortOrder: 0 },
    { label: "The academy", href: "#academy", sortOrder: 1 },
    { label: "One to LeetCode", href: "#program", sortOrder: 2 },
    { label: "Our values", href: "#values", sortOrder: 3 },
    { label: "The founder", href: "#founder", sortOrder: 4 },
  ];
  for (const item of navigation) await db.navigationItem.upsert({ where: { sortOrder: item.sortOrder }, create: item, update: { label: item.label, href: item.href } });

  const contentEntries = [
    ["brand.fullName", "ACTIVE • SHINE • RISE • VISION • ONE"],
    ["brand.tagline", "Learn. Code. Grow. Succeed."],
    ["organization.mission", "To provide accessible, practical and high-quality learning and mentorship that equips learners with technical skills, problem-solving ability, communication, confidence and career readiness."],
    ["organization.vision", "To build an empowered community of learners who create value for themselves, society and the world through technology, leadership, lifelong learning and responsible action."],
    ["organization.responseWindow", "within 24 hours on working days"],
  ] as const;
  for (const [key, value] of contentEntries) await db.siteContent.upsert({ where: { key }, create: { key, value, status: "PUBLISHED", publishedAt: new Date() }, update: { value, status: "PUBLISHED", publishedAt: new Date() } });

  console.info("ASRVOne reference content, permissions, learning path, and email templates are ready.");
  console.info("No batch schedule, user, testimonial, statistic, external social link, or credential was invented.");
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
