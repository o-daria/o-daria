import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Content</Card>);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders composed card structure", () => {
    render(
      <Card decorative>
        <CardHeader>
          <CardTitle>Project Title</CardTitle>
        </CardHeader>
        <CardContent>Body text</CardContent>
      </Card>
    );
    expect(screen.getByText("Project Title")).toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });
});
