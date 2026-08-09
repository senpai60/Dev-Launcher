import React, { useState } from "react";
import {
  Search,
  Code2,
  Terminal,
  Folder,
  Play,
  GitBranch,
  Copy,
  Edit,
  Trash2
} from "lucide-react";
import PageNavbar from "../../components/layout/navbar/PageNavbar";
import { ProjectCard, ProjectCardData } from "../../components/ui/ProjectCard/ProjectCard";
import { ContextMenuItem } from "../../components/ui/ContextMenu/ContextMenu";
import "./projects.css";

const initialProjects: ProjectCardData[] = [
  {
    id: "1",
    name: "BrutDesk",
    tech: "React · Express · MongoDB",
    path: "C:\\Projects\\BrutDesk",
    isFavorite: true,
  },
  {
    id: "2",
    name: "Gym Website",
    tech: "React · Tailwind · Node",
    path: "C:\\Projects\\Gym-Website",
    isFavorite: false,
  },
  {
    id: "3",
    name: "Tattoo Portfolio",
    tech: "Next.js · TypeScript · Framer",
    path: "C:\\Projects\\Tattoo-Portfolio",
    isFavorite: true,
  },
  {
    id: "4",
    name: "Electron Launcher",
    tech: "React · Electron · Vite",
    path: "C:\\Projects\\Dev-Launcher",
    isFavorite: true,
  },
  {
    id: "5",
    name: "E-Commerce API",
    tech: "Node.js · Express · PostgreSQL",
    path: "C:\\Projects\\E-Commerce-API",
    isFavorite: false,
  },
  {
    id: "6",
    name: "AI Dashboard",
    tech: "Python · FastAPI · React",
    path: "C:\\Projects\\AI-Dashboard",
    isFavorite: false,
  },
];

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<ProjectCardData[]>(initialProjects);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleFavorite = (id: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p))
    );
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tech.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic context menu builder for any project card
  const getDynamicMenuItems = (project: ProjectCardData): ContextMenuItem[] => [
    {
      id: "vscode",
      label: "Open in VS Code",
      icon: <Code2 size={14} />,
      onClick: () => console.log("Opening in VS Code:", project.name),
    },
    {
      id: "terminal",
      label: "Open Terminal",
      icon: <Terminal size={14} />,
      onClick: () => console.log("Opening terminal:", project.name),
    },
    {
      id: "folder",
      label: "Open Folder",
      icon: <Folder size={14} />,
      onClick: () => console.log("Opening folder:", project.name),
    },
    {
      id: "run",
      label: "Run Command",
      icon: <Play size={14} />,
      onClick: () => console.log("Running command:", project.name),
    },
    {
      id: "git",
      label: "Git",
      icon: <GitBranch size={14} />,
      onClick: () => console.log("Git overview:", project.name),
    },
    { id: "div1", isDivider: true },
    {
      id: "copy",
      label: "Copy Path",
      icon: <Copy size={14} />,
      onClick: () => navigator.clipboard.writeText(project.path),
    },
    {
      id: "edit",
      label: "Edit",
      icon: <Edit size={14} />,
      onClick: () => console.log("Editing project:", project.name),
    },
    {
      id: "delete",
      label: "Delete",
      icon: <Trash2 size={14} />,
      isDanger: true,
      onClick: () => setProjects((prev) => prev.filter((p) => p.id !== project.id)),
    },
  ];

  return (
    <section className="projects-page">
      <PageNavbar title="Projects / All Projects">
        <button
          className="action-btn text-button"
          style={{ padding: "var(--space-2) var(--space-4)", textAlign: "center" }}
        >
          + New Project
        </button>
      </PageNavbar>

      <div className="projects-content">
        {/* Search Bar */}
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Projects Grid with Extracted ProjectCard & Dynamic ContextMenu */}
        <div className="projects-grid">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onToggleFavorite={toggleFavorite}
              onOpenFolder={(p) => console.log("Open Folder", p.path)}
              onOpenVSCode={(p) => console.log("VS Code", p.path)}
              onOpenTerminal={(p) => console.log("Terminal", p.path)}
              menuItems={getDynamicMenuItems(project)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsPage;
