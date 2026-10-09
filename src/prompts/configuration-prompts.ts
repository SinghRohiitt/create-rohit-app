import { confirm, select } from "@inquirer/prompts";
import type { ProjectConfigPrompts } from "../config/resolve-project-config.js";
import type {
  Authentication,
  Backend,
  Database,
  Frontend,
  Language,
  ProjectType,
} from "../config/project-config.js";

export const configurationPrompts: ProjectConfigPrompts = {
  selectProjectType: (requireBackend) =>
    select<ProjectType>({
      message: "What do you want to build?",
      choices: requireBackend
        ? [
            { name: "Full Stack", value: "fullstack" },
            { name: "Backend", value: "backend" },
          ]
        : [
            { name: "Full Stack", value: "fullstack" },
            { name: "Frontend", value: "frontend" },
            { name: "Backend", value: "backend" },
          ],
      default: "fullstack",
    }),
  selectFrontend: () =>
    select<Exclude<Frontend, "none">>({
      message: "Frontend framework?",
      choices: [
        { name: "React + Vite", value: "react" },
        { name: "Next.js", value: "next" },
      ],
      default: "react",
    }),
  selectBackend: () =>
    select<Exclude<Backend, "none">>({
      message: "Backend framework?",
      choices: [
        { name: "Node.js + Express", value: "express" },
        { name: "NestJS", value: "nestjs" },
      ],
      default: "express",
    }),
  selectLanguage: () =>
    select<Language>({
      message: "Language?",
      choices: [
        { name: "TypeScript", value: "typescript" },
        { name: "JavaScript", value: "javascript" },
      ],
      default: "typescript",
    }),
  selectDatabase: (allowDatabase) =>
    select<Database>({
      message: "Database?",
      choices: allowDatabase
        ? [
            { name: "PostgreSQL", value: "postgres" },
            { name: "MongoDB", value: "mongodb" },
            { name: "None", value: "none" },
          ]
        : [{ name: "None", value: "none" }],
      default: "none",
    }),
  selectAuthentication: () =>
    select<Authentication>({
      message: "Authentication?",
      choices: [
        { name: "JWT", value: "jwt" },
        { name: "None", value: "none" },
      ],
      default: "none",
    }),
  confirmInstallDependencies: () =>
    confirm({
      message: "Install dependencies?",
      default: true,
    }),
};
