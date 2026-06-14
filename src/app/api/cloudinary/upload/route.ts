import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@/lib/supabase/server";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "image/avif", "image/svg+xml",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (images)
const MAX_RAW_FILE_SIZE = 25 * 1024 * 1024; // 25 MB (code / STL)
const ALLOWED_FOLDERS = new Set([
    "vajrax", "gallery", "projects", "avatars", "sponsors",
    "inventory", "progress-logs", "project-files",
]);

// Code + 3D-model extensions allowed for "raw" uploads (project log attachments).
const ALLOWED_RAW_EXTENSIONS = new Set([
    "stl",
    "py", "ipynb", "c", "h", "cpp", "hpp", "cc", "cxx", "ino",
    "js", "jsx", "ts", "tsx", "mjs", "cjs",
    "java", "kt", "go", "rs", "rb", "php", "swift", "m", "mm",
    "cs", "sh", "bash", "zsh", "ps1", "lua", "r", "jl", "dart",
    "html", "css", "scss", "sql", "json", "yaml", "yml", "toml",
    "xml", "md", "txt", "csv", "v", "vhd", "vhdl",
    "gcode", "nc", "scad", "urdf", "xacro", "launch",
]);

function fileExtension(name: string): string {
    const dot = name.lastIndexOf(".");
    return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    }

    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
        return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const rawFolder = (formData.get("folder") as string | null)?.trim() ?? "vajrax";
    const folder = ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : "vajrax";

    // "raw" => code / STL files (not images). Anything else is treated as an image.
    const kind = (formData.get("kind") as string | null)?.trim();
    const isRaw = kind === "raw";
    const originalName =
        (formData.get("filename") as string | null)?.trim() ||
        ((file as File).name ?? "file");

    if (isRaw) {
        const ext = fileExtension(originalName);
        if (!ALLOWED_RAW_EXTENSIONS.has(ext)) {
            return NextResponse.json({ error: `File type .${ext || "?"} not allowed.` }, { status: 400 });
        }
        if (file.size > MAX_RAW_FILE_SIZE) {
            return NextResponse.json({ error: "File exceeds 25 MB limit." }, { status: 400 });
        }
    } else {
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return NextResponse.json({ error: "File type not allowed." }, { status: 400 });
        }
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "File exceeds 10 MB limit." }, { status: 400 });
        }
    }

    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const result = await new Promise<{ secure_url: string; public_id: string }>(
            (resolve, reject) => {
                cloudinary.uploader
                    .upload_stream(
                        isRaw
                            ? { folder, resource_type: "raw", use_filename: true, unique_filename: true }
                            : { folder, resource_type: "image" },
                        (err, res) => {
                            if (err || !res) reject(err ?? new Error("Upload failed"));
                            else resolve(res as { secure_url: string; public_id: string });
                        }
                    )
                    .end(buffer);
            }
        );

        return NextResponse.json({
            url: result.secure_url,
            public_id: result.public_id,
            name: originalName,
        });
    } catch (err) {
        console.error("[cloudinary upload]", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Upload failed." },
            { status: 500 }
        );
    }
}
