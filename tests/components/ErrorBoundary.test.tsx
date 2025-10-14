import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../../src/components/ErrorBoundary";
import { vi } from "vitest";

const ProblemChild = () => {
  throw new Error("Test Error");
};

describe("ErrorBoundary", () => {
  it("should render children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Child Content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("should render the fallback UI when an error is thrown", () => {
    // Prevent vitest from printing the error
    const mockConsoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Une erreur est survenue")).toBeInTheDocument();
    expect(screen.getByText("Réessayer")).toBeInTheDocument();
    mockConsoleError.mockRestore();
  });

  it("should render a custom fallback message when provided", () => {
    const mockConsoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    render(
      <ErrorBoundary message="Custom error message">
        <ProblemChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom error message")).toBeInTheDocument();
    mockConsoleError.mockRestore();
  });

  it("should render a custom fallback component when provided", () => {
    const mockConsoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>Custom Fallback</div>}>
        <ProblemChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom Fallback")).toBeInTheDocument();
    mockConsoleError.mockRestore();
  });
});
