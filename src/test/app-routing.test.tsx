import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

const locationDescriptor = Object.getOwnPropertyDescriptor(window, "location");

vi.mock("@/lib/local-accounts", () => ({
  createLocalAccount: vi.fn().mockResolvedValue({ account: {}, inviteCode: "TEST1234" }),
  getCurrentLocalAccount: vi.fn(() => null),
  getLocalSession: vi.fn(() => null),
  loginLocalAccount: vi.fn().mockResolvedValue({}),
  setLocalSession: vi.fn(),
}));

function mockLocationAssign() {
  const assign = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { assign },
  });
  return assign;
}

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
  if (locationDescriptor) Object.defineProperty(window, "location", locationDescriptor);
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

  it("goes straight to the patient companion after creating an account", async () => {
    const assign = mockLocationAssign();
    const { getByLabelText, getByRole, getAllByRole } = renderAt("/account");

    await waitFor(() => {
      expect(getByRole("heading", { name: "Create a local account" })).toBeInTheDocument();
    });
    fireEvent.change(getByLabelText("Your name"), { target: { value: "Alex Patient" } });
    fireEvent.change(getByLabelText("Patient name"), { target: { value: "Alex Patient" } });
    fireEvent.change(getByLabelText("Name to use in conversation"), {
      target: { value: "Alex" },
    });
    fireEvent.change(getByLabelText("Email"), { target: { value: "alex@example.test" } });
    fireEvent.change(getByLabelText("Password"), { target: { value: "patient-pass-123" } });
    fireEvent.click(getAllByRole("button", { name: "Create account" }).at(-1)!);

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/companion"));
  });

  it("goes straight to the patient companion after logging in", async () => {
    const assign = mockLocationAssign();
    const { getByLabelText, getByRole, getAllByRole } = renderAt("/account");

    await waitFor(() => {
      expect(getByRole("heading", { name: "Create a local account" })).toBeInTheDocument();
    });
    fireEvent.click(getByRole("button", { name: "Log in" }));
    fireEvent.change(getByLabelText("Email"), { target: { value: "alex@example.test" } });
    fireEvent.change(getByLabelText("Password"), { target: { value: "patient-pass-123" } });
    fireEvent.click(getAllByRole("button", { name: "Log in" }).at(-1)!);

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/companion"));
  });

  it("opens the patient companion directly in Demo mode", async () => {
    const assign = mockLocationAssign();
    const { getByRole } = renderAt("/account");

    await waitFor(() => {
      expect(getByRole("button", { name: "Continue in Demo mode" })).toBeInTheDocument();
    });
    fireEvent.click(getByRole("button", { name: "Continue in Demo mode" }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/companion"));
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
