import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "react-toastify";
import * as importExportApi from "../../api/importExport";
import * as download from "../../utils/download";
import DataManagementSection from "../DataManagementSection";

vi.mock("../../utils/download", () => ({ downloadBlob: vi.fn(), downloadUrl: vi.fn() }));

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <DataManagementSection />
    </QueryClientProvider>
  );
}

const RESULT = {
  restoredCars: 42,
  restoredSets: 3,
  restoredPhotos: 0,
  safetySnapshotPath: "pre-restore.json",
};

async function pickFile(file: File) {
  await userEvent.upload(screen.getByTestId("restore-file"), file);
}

describe("DataManagementSection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(download.downloadBlob).mockClear();
    vi.mocked(download.downloadUrl).mockClear();
  });

  it("offers a .zip or .json export and a single restore, with no CSV", () => {
    renderSection();

    expect(screen.getByRole("button", { name: "With photos (.zip)" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Data only (.json)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /restore from backup/i })).toBeInTheDocument();
    expect(screen.queryByText(/csv/i)).not.toBeInTheDocument();
  });

  it("downloads the full backup through its signed link", async () => {
    vi.spyOn(importExportApi, "fullBackupDownloadUrl").mockResolvedValue(
      "http://x/api/export/backup/full/t/b.zip"
    );
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "Export" }));

    await waitFor(() =>
      expect(download.downloadUrl).toHaveBeenCalledWith("http://x/api/export/backup/full/t/b.zip")
    );
  });

  it("exports the data alone as .json", async () => {
    vi.spyOn(importExportApi, "exportBackupBlob").mockResolvedValue(new Blob(["{}"]));
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "Data only (.json)" }));
    await user.click(screen.getByRole("button", { name: "Export" }));

    await waitFor(() =>
      expect(download.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "diecast-backup.json")
    );
  });

  it("asks before replacing the collection, then restores and reports photos", async () => {
    const restore = vi
      .spyOn(importExportApi, "restoreBackup")
      .mockResolvedValue({ ...RESULT, restoredPhotos: 7 });
    const toastSpy = vi.spyOn(toast, "success");
    const user = userEvent.setup();
    renderSection();

    await pickFile(new File(["PK"], "diecast-backup.zip", { type: "application/zip" }));
    expect(restore).not.toHaveBeenCalled();
    expect(await screen.findByText(/diecast-backup\.zip/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Replace collection" }));

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.stringContaining("42 vehicle(s), 3 set(s) and 7 photo(s)"),
        expect.anything()
      )
    );
  });

  it("doesn't restore when the confirmation is cancelled", async () => {
    const restore = vi.spyOn(importExportApi, "restoreBackup").mockResolvedValue(RESULT);
    const user = userEvent.setup();
    renderSection();

    await pickFile(new File(["{}"], "backup.json", { type: "application/json" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(restore).not.toHaveBeenCalled();
  });

  it("shows an error toast when the restore fails", async () => {
    vi.spyOn(importExportApi, "restoreBackup").mockRejectedValue(new Error("Bad file"));
    const toastSpy = vi.spyOn(toast, "error");
    const user = userEvent.setup();
    renderSection();

    await pickFile(new File(["invalid"], "bad.json", { type: "application/json" }));
    await user.click(await screen.findByRole("button", { name: "Replace collection" }));

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to restore"),
        expect.anything()
      )
    );
  });
});
