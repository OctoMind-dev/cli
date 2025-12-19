import path from "node:path";
import fs from "fs";
import os from "os";
import { promptUser } from "../src/helpers";
import { createOctomindDirInteractive, getPathToOctomindDir, OCTOMIND_DIR } from "../src/dirManagement";
jest.mock("../src/helpers");

describe("dirManagement", () => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    let tmpDir: string;

    beforeEach(() => {
        console.log = jest.fn();
        console.error = jest.fn();
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "octomind-cli-test-"));
        jest.mocked(promptUser).mockResolvedValue("y");

    })

    afterEach(() => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
        }
    });

    describe("getPathToOctomindDir", () => {

        it("should return the path to the existing octomind directory", async () => {
            fs.mkdirSync(path.join(tmpDir, OCTOMIND_DIR), { recursive: true });
            fs.mkdirSync(path.join(tmpDir, "random-dir"), { recursive: true });
            const octomindDir = await getPathToOctomindDir({ startDir: tmpDir, allowCreation: false });
            const octomindDirNested = await getPathToOctomindDir({ 
                startDir: path.join(tmpDir, "random-dir"),
                allowCreation: false
            });

            expect(octomindDir).toBe(path.join(tmpDir, OCTOMIND_DIR));
            expect(octomindDirNested).toBe(path.join(tmpDir, OCTOMIND_DIR));
        })

        it("should return null if no octomind directory is found", async () => {
            const octomindDir = await getPathToOctomindDir({ startDir: tmpDir, allowCreation: false });
            expect(octomindDir).toBeNull();
        })

        it("should create the octomind directory if allowCreation is true", async () => {
            const octomindDir = await getPathToOctomindDir({ startDir: tmpDir, allowCreation: true });
            expect(octomindDir).toBe(path.join(tmpDir, OCTOMIND_DIR));
        })

    })

    describe("createOctomindDirInteractive", () => {
        it("should create the octomind directory if it doesn't exist", async () => {
            const octomindDir = await createOctomindDirInteractive({ dir: tmpDir });
            expect(octomindDir).toBe(path.join(tmpDir, OCTOMIND_DIR));
            expect(fs.existsSync(path.join(tmpDir, OCTOMIND_DIR))).toBe(true);
        })

        it("should return the path to the existing octomind directory if it already exists", async () => {
            fs.mkdirSync(path.join(tmpDir, OCTOMIND_DIR), { recursive: true });
            const octomindDir = await createOctomindDirInteractive({ 
                dir: path.join(tmpDir, "random-dir"),
                recreateOctomindDir: false
            });
            expect(octomindDir).toBe(path.join(tmpDir, OCTOMIND_DIR));
            expect(fs.existsSync(path.join(tmpDir, OCTOMIND_DIR))).toBe(true);
            expect(console.log).toHaveBeenCalledWith("Using existing octomind directory.");
        })

        it("should remove the existing octomind directory if recreateOctomindDir is true", async () => {
            fs.mkdirSync(path.join(tmpDir, OCTOMIND_DIR), { recursive: true });
            const octomindDir = await createOctomindDirInteractive({ dir: tmpDir, recreateOctomindDir: true });
            expect(octomindDir).toBe(path.join(tmpDir, OCTOMIND_DIR));
            expect(fs.existsSync(path.join(tmpDir, OCTOMIND_DIR))).toBe(true);
            expect(console.log).toHaveBeenCalledWith("Removing and recreating empty directory...");
        })

        it("should prompt the user to remove the existing octomind directory if recreateOctomindDir is not true", async () => {
            fs.mkdirSync(path.join(tmpDir, OCTOMIND_DIR), { recursive: true });
            const octomindDir = await createOctomindDirInteractive({ dir: tmpDir });
            expect(octomindDir).toBe(path.join(tmpDir, OCTOMIND_DIR));
            expect(fs.existsSync(path.join(tmpDir, OCTOMIND_DIR))).toBe(true);
            expect(promptUser).toHaveBeenCalledWith("Remove and recreate empty directory? (y/N): ");
            expect(console.log).toHaveBeenCalledWith("Removing and recreating empty directory...");
        })

        it("should not remove the existing octomind directory if the user does not confirm", async () => {
            fs.mkdirSync(path.join(tmpDir, OCTOMIND_DIR), { recursive: true });
            jest.mocked(promptUser).mockResolvedValue("n");
            const octomindDir = await createOctomindDirInteractive({ dir: tmpDir });
            expect(octomindDir).toBe(path.join(tmpDir, OCTOMIND_DIR));
            expect(fs.existsSync(path.join(tmpDir, OCTOMIND_DIR))).toBe(true);
            expect(promptUser).toHaveBeenCalledWith("Remove and recreate empty directory? (y/N): ");
            expect(console.log).toHaveBeenCalledWith("Using existing octomind directory.");
        })
    })
})
