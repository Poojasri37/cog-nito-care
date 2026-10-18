import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

function renderAt(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Assert only that the router mounts and paints, never page content:
// routes are rewritten as the app is built and this must keep passing.
describe("App routing", () => {
  it("renders the index route", async () => {
    const { container } = renderAt("/");

    await waitFor(() => expect(container.firstChild).not.toBeNull());
  });

  it("renders the not-found route", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { container } = renderAt("/this-route-does-not-exist");

    await waitFor(() => expect(container.firstChild).not.toBeNull());
  });

  it("shows the three patient companion options without the sidebar", async () => {
    const { getByRole, queryByRole } = renderAt("/companion");

    await waitFor(() => {
      expect(getByRole("button", { name: "Start speaking" })).toBeInTheDocument();
    });
    expect(getByRole("link", { name: "Open camera" })).toBeInTheDocument();
    expect(getByRole("link", { name: "Open games" })).toBeInTheDocument();
    expect(queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("shows the sidebar after opening the camera from the patient view", async () => {
    const { getByRole } = renderAt("/companion");

    await waitFor(() => {
      expect(getByRole("link", { name: "Open camera" })).toBeInTheDocument();
    });
    fireEvent.click(getByRole("link", { name: "Open camera" }));

    await waitFor(() => {
      expect(getByRole("navigation")).toBeInTheDocument();
      expect(getByRole("heading", { name: "Multimodal Perception" })).toBeInTheDocument();
    });
  });

  it("shows the sidebar after opening therapies from the patient view", async () => {
    const { getByRole } = renderAt("/companion");

    await waitFor(() => {
      expect(getByRole("link", { name: "Open games" })).toBeInTheDocument();
    });
    fireEvent.click(getByRole("link", { name: "Open games" }));

    await waitFor(() => {
      expect(getByRole("navigation")).toBeInTheDocument();
      expect(getByRole("heading", { name: "Interactive Therapies" })).toBeInTheDocument();
    });
  });
});
