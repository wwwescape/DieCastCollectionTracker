import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DangerZoneSection from "../DangerZoneSection";

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() },
}));

const runAction = vi.fn();

vi.mock("../../hooks/useDangerZone", () => ({
  useDangerZoneAction: () => ({ mutateAsync: runAction, isPending: false }),
}));

describe("DangerZoneSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runAction.mockResolvedValue({ removed: {}, safetySnapshotPath: null });
  });

  it("says what each action removes and keeps", () => {
    render(<DangerZoneSection />);

    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
    expect(
      screen.getByText(/Removes the notes on every vehicle and set\. Keeps everything else\./)
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Clear" })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Reset" })).toHaveLength(3);
  });

  it("runs a tidy-up action once confirmed", async () => {
    const user = userEvent.setup();
    render(<DangerZoneSection />);

    await user.click(screen.getAllByRole("button", { name: "Remove" })[1]);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Remove unused photo files?")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Remove unused photo files" }));

    expect(runAction).toHaveBeenCalledWith({
      action: "remove_unused_photos",
      confirmation: undefined,
    });
  });

  it("only resets once RESET is typed exactly", async () => {
    const user = userEvent.setup();
    render(<DangerZoneSection />);

    await user.click(screen.getAllByRole("button", { name: "Reset" })[0]);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/safety snapshot/)).toBeInTheDocument();
    const confirm = within(dialog).getByRole("button", { name: "Reset vehicles" });
    const field = within(dialog).getByLabelText("Type RESET to confirm");

    await user.type(field, "reset");
    expect(confirm).toBeDisabled();
    await user.clear(field);
    await user.type(field, "RESET");
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(runAction).toHaveBeenCalledWith({ action: "reset_vehicles", confirmation: "RESET" });
  });
});
