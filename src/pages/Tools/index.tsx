import Layout from "@/layouts/Default";
import React from "react";
import Calculator from "@/components/Tools/Calculator";
import DiceRoll from "@/components/Tools/DiceRoll";
import HigherLower from "@/components/Tools/HigherLower";
import NameInspector from "@/components/Tools/NameInspector";
import styled from "styled-components";
import RoyaltyChecker from '../../components/Tools/RoyaltyChecker';
import PixelDustChecker from "@/components/Tools/PixelDustChecker";
import { useParams, useNavigate } from "react-router-dom";
import NamePicker from "@/components/Tools/NamePicker";

const toolsConfig = [
  {
    id: "calculator",
    name: "Calculator",
    component: Calculator,
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="6"
          y="4"
          width="20"
          height="24"
          rx="2"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect
          x="9"
          y="7"
          width="14"
          height="5"
          rx="1"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="11" cy="16" r="1.5" fill="currentColor" />
        <circle cx="16" cy="16" r="1.5" fill="currentColor" />
        <circle cx="21" cy="16" r="1.5" fill="currentColor" />
        <circle cx="11" cy="20" r="1.5" fill="currentColor" />
        <circle cx="16" cy="20" r="1.5" fill="currentColor" />
        <circle cx="21" cy="20" r="1.5" fill="currentColor" />
        <circle cx="11" cy="24" r="1.5" fill="currentColor" />
        <circle cx="16" cy="24" r="1.5" fill="currentColor" />
        <circle cx="21" cy="24" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "diceroll",
    name: "Dice Roll",
    component: DiceRoll,
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="6"
          y="6"
          width="20"
          height="20"
          rx="4"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="11" cy="11" r="2" fill="currentColor" />
        <circle cx="21" cy="21" r="2" fill="currentColor" />
        <circle cx="16" cy="16" r="2" fill="currentColor" />
        <circle cx="11" cy="21" r="2" fill="currentColor" />
        <circle cx="21" cy="11" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "higherlower",
    name: "Higher or Lower",
    component: HigherLower,
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 20L16 12L24 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="4"
          y="4"
          width="24"
          height="24"
          rx="2"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  {
    id: "nameinspector",
    name: "Name Inspector",
    component: NameInspector,
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13 15L8 20L13 25"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 15L24 20L19 25"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="4"
          y="4"
          width="24"
          height="24"
          rx="2"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  {
    id: "royaltychecker",
    name: "Royalty Checker",
    component: RoyaltyChecker,
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M16 4L19.2411 12.7589L28 16L19.2411 19.2411L16 28L12.7589 19.2411L4 16L12.7589 12.7589L16 4Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "pixeldustchecker",
    name: "Pixel Dust Checker",
    component: PixelDustChecker,
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="8"
          y="8"
          width="16"
          height="16"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect
          x="12"
          y="12"
          width="4"
          height="4"
          fill="currentColor"
        />
        <rect
          x="16"
          y="16"
          width="4"
          height="4"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "namepicker",
    name: "Name Picker",
    component: NamePicker,
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M16 4L19 10L26 11L21 15.5L22 22L16 19L10 22L11 15.5L6 11L13 10L16 4Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const ToolCard = styled.div`
  background: var(--background-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .tool-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tool-name {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
    text-align: center;
  }

  .tool-meta {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
`;

// Add new styled component for the grid
const ToolsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  padding: 1rem;
`;

interface HeroSectionProps {
  isToolSelected: boolean;
}

// Update the HeroSection styled component
const HeroSection = styled.div<HeroSectionProps>`
  padding: ${(props) => (props.isToolSelected ? "0.75rem" : "3rem 1rem")};
  background: linear-gradient(
    135deg,
    rgba(52, 211, 153, 0.95) 0%,
    rgba(5, 150, 105, 0.95) 100%
  );
  margin-bottom: ${(props) => (props.isToolSelected ? "1rem" : "2rem")};
  position: relative;
  overflow: hidden;
  box-shadow: ${(props) =>
    props.isToolSelected
      ? "0 2px 10px rgba(52, 211, 153, 0.2)"
      : "0 4px 20px rgba(52, 211, 153, 0.3)"};
  transition: all 0.3s ease-out;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      circle at center,
      rgba(255, 255, 255, 0.1) 0%,
      transparent 70%
    );
    pointer-events: none;
  }
`;

const HeroContent = styled.div<{ isToolSelected: boolean }>`
  max-width: 800px;
  margin: 0 auto;
  text-align: ${(props) => (props.isToolSelected ? "left" : "center")};
  position: relative;
  z-index: 1;
  transition: all 0.3s ease-out;

  h1 {
    font-size: ${(props) => (props.isToolSelected ? "1.25rem" : "3rem")};
    margin-bottom: ${(props) => (props.isToolSelected ? "0" : "1rem")};
    color: white;
    letter-spacing: -0.5px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .breadcrumb-separator {
      opacity: ${(props) => (props.isToolSelected ? "1" : "0")};
      transition: opacity 0.3s ease-out;
    }

    .tool-name {
      opacity: ${(props) => (props.isToolSelected ? "1" : "0")};
      transition: opacity 0.3s ease-out;
      font-weight: 400;
    }

    .arcade-title {
      cursor: pointer;
      &:hover {
        opacity: 0.8;
      }
    }
  }

  p {
    font-size: 1.25rem;
    color: rgba(255, 255, 255, 0.95);
    margin-bottom: 2rem;
    line-height: 1.6;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    opacity: ${(props) => (props.isToolSelected ? "0" : "1")};
    height: ${(props) => (props.isToolSelected ? "0" : "auto")};
    overflow: hidden;
    transition: all 0.3s ease-out;
  }
`;

// Add new styled component for the selected tool container
const SelectedToolContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;

  .back-button {
    margin-top: 2rem;
    padding: 0.5rem 1rem;
    background: var(--background-secondary);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s ease;

    &:hover {
      background: var(--background-tertiary);
    }
  }
`;

const Tools: React.FC = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTool, setSelectedTool] = React.useState<string | null>(null);
  const navigate = useNavigate();
  const { tool } = useParams();

  // Update useEffect to use router params instead of URL query
  React.useEffect(() => {
    if (tool && toolsConfig.some(t => t.id === tool)) {
      setSelectedTool(tool);
    }
  }, [tool]);

  const filteredTools = toolsConfig.filter((tool) =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    // Use navigate instead of manipulating URL directly
    navigate(`/tools/${toolId}`);
  };

  // Update the back button handler
  const handleBackToTools = () => {
    setSelectedTool(null);
    // Use navigate for going back to tools list
    navigate('/tools');
  };

  const selectedToolName = toolsConfig.find(
    (tool) => tool.id === selectedTool
  )?.name;

  return (
    <>
      <HeroSection isToolSelected={!!selectedTool}>
        <HeroContent isToolSelected={!!selectedTool}>
          <h1>
            <span
              className="arcade-title"
              onClick={() => setSelectedTool(null)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setSelectedTool(null);
                }
              }}
            >
              Vibe Arcade
            </span>
            {selectedTool && (
              <>
                <span className="breadcrumb-separator">/</span>
                <span className="tool-name">{selectedToolName}</span>
              </>
            )}
          </h1>
          <p>
            Discover our collection of helpful tools designed to make your work
            easier and more efficient.
          </p>
        </HeroContent>
      </HeroSection>
      <Layout>
        <div className="tools-container">
          {!selectedTool && (
            <div className="search-container" role="search">
              <input
                type="text"
                id="toolSearch"
                className="search-bar"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search tools"
              />
            </div>
          )}
          {selectedTool ? (
            <SelectedToolContainer>
              {React.createElement(
                toolsConfig.find((tool) => tool.id === selectedTool)
                  ?.component || (() => null)
              )}
              <button
                className="back-button"
                onClick={handleBackToTools}
                aria-label="Back to tools list"
              >
                Back to Tools
              </button>
            </SelectedToolContainer>
          ) : (
            <ToolsGrid
              className="tools-grid"
              role="grid"
              aria-label="Available tools"
            >
              {filteredTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  onKeyPress={(e) => handleToolSelect(tool.id)}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`${tool.name} tool`}
                >
                  <div className="tool-icon" aria-hidden="true">
                    <div className="icon-wrapper">{tool.icon}</div>
                  </div>
                  <h3 className="tool-name">{tool.name}</h3>
                </ToolCard>
              ))}
            </ToolsGrid>
          )}
        </div>
      </Layout>
    </>
  );
};

export default Tools;
