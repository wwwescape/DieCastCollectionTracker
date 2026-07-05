import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "react-toastify";
import * as importExportApi from "../../api/importExport";
import DataManagementSection from "../DataManagementSection";

vi.mock("../../utils/download", () => ({ downloadBlob: vi.fn() }));

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <DataManagementSection />
    </QueryClientProvider>
  );
}

describe("DataManagementSection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders export and restore buttons", () => {
    renderSection();

    expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export backup/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /restore from backup/i })).toBeInTheDocument();
  });

  it("calls exportCsvBlob on Export CSV click", async () => {
    const mockBlob = new Blob(["name,manufacturer"], { type: "text/csv" });
    vi.spyOn(importExportApi, "exportCsvBlob").mockResolvedValue(mockBlob);

    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: /export csv/i }));

    await waitFor(() => expect(importExportApi.exportCsvBlob).toHaveBeenCalled());
  });

  it("calls exportBackupBlob on Export Backup click", async () => {
    const mockBlob = new Blob([JSON.stringify({ version: 1 })], { type: "application/json" });
    vi.spyOn(importExportApi, "exportBackupBlob").mockResolvedValue(mockBlob);

    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: /export backup/i }));

    await waitFor(() => expect(importExportApi.exportBackupBlob).toHaveBeenCalled());
  });

  it("shows success toast after successful restore", async () => {
    vi.spyOn(importExportApi, "restoreBackup").mockResolvedValue({
      restoredCars: 42,
      safetySnapshotPath: "/backups/pre-restore.json",
    });
    const toastSpy = vi.spyOn(toast, "success");

    renderSection();

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File([JSON.stringify({ version: 1 })], "backup.json", { type: "application/json" });
    await userEvent.upload(fileInput, file);

    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining("42")));
  });

  it("shows error toast when restore fails", async () => {
    vi.spyOn(importExportApi, "restoreBackup").mockRejectedValue(new Error("Bad file"));
    const toastSpy = vi.spyOn(toast, "error");

    renderSection();

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["invalid"], "bad.json", { type: "application/json" });
    await userEvent.upload(fileInput, file);

    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to restore"), expect.anything()));
  });
});
