"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Html } from "@react-three/drei";
import * as THREE from "three";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";

type ProfileLanyardProps = {
    avatarUrl: string | null;
    displayName: string;
    roleLabel?: string | null;
    cameraDistance?: number;
};

type LoadedCardTexture = {
    texture: THREE.CanvasTexture;
    accent: string;
    secondaryAccent: string;
};

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function truncateCanvasText(
    ctx: CanvasRenderingContext2D,
    value: string,
    maxWidth: number
) {
    if (ctx.measureText(value).width <= maxWidth) {
        return value;
    }

    const ellipsis = "...";
    let truncated = value;

    while (truncated.length > 0 && ctx.measureText(`${truncated}${ellipsis}`).width > maxWidth) {
        truncated = truncated.slice(0, -1);
    }

    return `${truncated.trimEnd()}${ellipsis}`;
}

async function loadCardTexture(avatarUrl: string | null, displayName: string, roleLabel?: string | null) {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1400;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("Canvas 2D context unavailable");
    }

    const primary = "#7b61ff";
    const secondary = "#4cc9f0";
    const accent = "#1fe8d8";

    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, "#101c34");
    bgGradient.addColorStop(0.55, "#0b172b");
    bgGradient.addColorStop(1, "#07111f");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glow = ctx.createRadialGradient(150, 180, 40, 150, 180, 480);
    glow.addColorStop(0, "rgba(123,97,255,0.40)");
    glow.addColorStop(1, "rgba(123,97,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glow2 = ctx.createRadialGradient(760, 220, 30, 760, 220, 360);
    glow2.addColorStop(0, "rgba(31,232,216,0.26)");
    glow2.addColorStop(1, "rgba(31,232,216,0)");
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(138,215,255,0.34)";
    ctx.lineWidth = 8;
    roundedRect(ctx, 24, 24, canvas.width - 48, canvas.height - 48, 46);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.04)";
    roundedRect(ctx, 60, 84, canvas.width - 120, 120, 60);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.font = "700 42px sans-serif";
    ctx.fillText("VAJRAX MEMBER PASS", 92, 160);

    const photoX = 96;
    const photoY = 260;
    const photoSize = 708;

    ctx.save();
    roundedRect(ctx, photoX, photoY, photoSize, photoSize, 46);
    ctx.clip();

    if (avatarUrl) {
        try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const image = new Image();
                image.crossOrigin = "anonymous";
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = avatarUrl;
            });

            const scale = Math.max(photoSize / img.width, photoSize / img.height);
            const width = img.width * scale;
            const height = img.height * scale;
            const offsetX = photoX + (photoSize - width) / 2;
            const offsetY = photoY + (photoSize - height) / 2;
            ctx.drawImage(img, offsetX, offsetY, width, height);
        } catch {
            const fallbackGradient = ctx.createLinearGradient(photoX, photoY, photoX + photoSize, photoY + photoSize);
            fallbackGradient.addColorStop(0, "#172b4f");
            fallbackGradient.addColorStop(1, "#0b1d33");
            ctx.fillStyle = fallbackGradient;
            ctx.fillRect(photoX, photoY, photoSize, photoSize);
        }
    } else {
        const fallbackGradient = ctx.createLinearGradient(photoX, photoY, photoX + photoSize, photoY + photoSize);
        fallbackGradient.addColorStop(0, "#172b4f");
        fallbackGradient.addColorStop(1, "#0b1d33");
        ctx.fillStyle = fallbackGradient;
        ctx.fillRect(photoX, photoY, photoSize, photoSize);
    }

    const overlayGradient = ctx.createLinearGradient(0, photoY + 380, 0, photoY + photoSize);
    overlayGradient.addColorStop(0, "rgba(8,12,24,0)");
    overlayGradient.addColorStop(1, "rgba(4,8,18,0.92)");
    ctx.fillStyle = overlayGradient;
    ctx.fillRect(photoX, photoY, photoSize, photoSize);
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 4;
    roundedRect(ctx, photoX, photoY, photoSize, photoSize, 46);
    ctx.stroke();

    ctx.fillStyle = "#eff6ff";
    ctx.font = "700 78px sans-serif";
    const fittedDisplayName = truncateCanvasText(ctx, displayName, canvas.width - 184);
    ctx.fillText(fittedDisplayName, 92, 1090);

    if (roleLabel) {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        roundedRect(ctx, 92, 1128, 290, 78, 32);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = 3;
        roundedRect(ctx, 92, 1128, 290, 78, 32);
        ctx.stroke();
        ctx.fillStyle = "#fb7185";
        ctx.font = "700 36px sans-serif";
        ctx.fillText(roleLabel.toUpperCase(), 126, 1178);
    }

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "600 34px sans-serif";
    ctx.fillText("Robotics Club @ Newton School of Technology", 92, 1285);

    const stripe = ctx.createLinearGradient(92, 1320, canvas.width - 92, 1320);
    stripe.addColorStop(0, primary);
    stripe.addColorStop(0.55, secondary);
    stripe.addColorStop(1, accent);
    ctx.fillStyle = stripe;
    ctx.fillRect(92, 1328, canvas.width - 184, 14);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;

    return {
        texture,
        accent: secondary,
        secondaryAccent: primary,
    } satisfies LoadedCardTexture;
}

function LanyardLoader() {
    return (
        <div className="absolute inset-0 flex items-center justify-center rounded-[28px] border border-cyan-200/20 bg-[linear-gradient(180deg,rgba(8,20,34,0.66),rgba(6,16,28,0.44))] backdrop-blur-xl">
            <div className="flex flex-col items-center gap-3 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
                <p className="text-sm font-medium text-cyan-100/90">Rendering profile lanyard...</p>
            </div>
        </div>
    );
}

function Scene({ cardTexture, cameraDistance }: { cardTexture: LoadedCardTexture; cameraDistance: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const clipRef = useRef<THREE.Mesh>(null);
    const lineLeftGeometry = useMemo(() => new MeshLineGeometry(), []);
    const lineRightGeometry = useMemo(() => new MeshLineGeometry(), []);
    const lineMaterial = useMemo(() => {
        const material = new MeshLineMaterial({
            color: new THREE.Color("#9ad3ff"),
            lineWidth: 0.18,
            resolution: new THREE.Vector2(1, 1),
        });
        material.transparent = true;
        material.opacity = 0.9;
        material.depthTest = false;
        return material;
    }, []);
    const pointerTarget = useRef({ x: 0, y: 0 });
    const { pointer, size } = useThree();

    useEffect(() => {
        return () => {
            lineLeftGeometry.dispose();
            lineRightGeometry.dispose();
            lineMaterial.dispose();
            cardTexture.texture.dispose();
        };
    }, [cardTexture.texture, lineLeftGeometry, lineMaterial, lineRightGeometry]);

    useFrame((state) => {
        if (!groupRef.current || !clipRef.current) return;

        pointerTarget.current.x = THREE.MathUtils.lerp(pointerTarget.current.x, pointer.x, 0.08);
        pointerTarget.current.y = THREE.MathUtils.lerp(pointerTarget.current.y, pointer.y, 0.08);

        const t = state.clock.getElapsedTime();
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, pointerTarget.current.x * 0.55, 0.08);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, pointerTarget.current.y * -0.35, 0.08);
        groupRef.current.position.y = Math.sin(t * 1.4) * 0.12 - 0.3;

        clipRef.current.rotation.z += 0.006;

        const topY = 7.2;
        const cardTopY = 4.05 + groupRef.current.position.y;
        const leftX = -1.25;
        const rightX = 1.25;
        const bend = pointerTarget.current.x * 0.85;
        const sway = Math.sin(t * 1.6) * 0.16;

        lineLeftGeometry.setPoints([
            0,
            topY,
            0,
            -0.45 + bend * 0.2,
            5.55,
            0,
            leftX + bend * 0.35,
            cardTopY + 0.35 + sway,
            0,
        ]);
        lineRightGeometry.setPoints([
            0,
            topY,
            0,
            0.45 + bend * 0.2,
            5.55,
            0,
            rightX + bend * 0.35,
            cardTopY + 0.35 - sway,
            0,
        ]);

        lineMaterial.uniforms.resolution.value.set(size.width, size.height);
    });

    return (
        <>
            <ambientLight intensity={1.35} />
            <directionalLight position={[4, 9, 7]} intensity={2.8} color="#d8f3ff" />
            <pointLight position={[-5, 2, 3]} intensity={18} color={cardTexture.secondaryAccent} distance={24} />
            <pointLight position={[6, -3, 5]} intensity={14} color={cardTexture.accent} distance={22} />

            <Float speed={2} rotationIntensity={0.16} floatIntensity={0.2}>
                <group ref={groupRef}>
                    <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
                        <planeGeometry args={[5.9, 8.6, 24, 24]} />
                        <meshPhysicalMaterial
                            map={cardTexture.texture}
                            metalness={0.12}
                            roughness={0.72}
                            clearcoat={1}
                            clearcoatRoughness={0.28}
                            sheen={1}
                            sheenColor={new THREE.Color("#e7f7ff")}
                        />
                    </mesh>
                    <mesh position={[0, 4.95, 0.24]} ref={clipRef}>
                        <torusGeometry args={[0.62, 0.12, 18, 48]} />
                        <meshStandardMaterial color="#d9e7ff" metalness={0.9} roughness={0.25} />
                    </mesh>
                    <mesh position={[0, 4.95, 0.2]}>
                        <cylinderGeometry args={[0.22, 0.22, 1.1, 24]} />
                        <meshStandardMaterial color="#6bd8ff" emissive="#143047" metalness={0.35} roughness={0.42} />
                    </mesh>
                </group>
            </Float>

            <mesh geometry={lineLeftGeometry} material={lineMaterial} position={[0, 0, -0.02]} />
            <mesh geometry={lineRightGeometry} material={lineMaterial} position={[0, 0, -0.02]} />

            <Html position={[0, -5.8, 0]} center>
                <div className="rounded-full border border-cyan-200/20 bg-[#091725]/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/75 backdrop-blur-md">
                    Camera Distance {cameraDistance}
                </div>
            </Html>
        </>
    );
}

export default function ProfileLanyard({
    avatarUrl,
    displayName,
    roleLabel,
    cameraDistance = 20,
}: ProfileLanyardProps) {
    const [cardTexture, setCardTexture] = useState<LoadedCardTexture | null>(null);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        let active = true;

        setCardTexture(null);
        setLoadError(false);

        loadCardTexture(avatarUrl, displayName, roleLabel)
            .then((result) => {
                if (!active) {
                    result.texture.dispose();
                    return;
                }
                setCardTexture(result);
            })
            .catch(() => {
                if (active) setLoadError(true);
            });

        return () => {
            active = false;
        };
    }, [avatarUrl, displayName, roleLabel]);

    return (
        <div className="relative aspect-[5/6] min-h-[420px] w-full overflow-hidden rounded-[30px] border border-cyan-200/16 bg-[radial-gradient(circle_at_top,rgba(123,97,255,0.16),rgba(8,20,34,0.58)_42%,rgba(5,14,28,0.84))] shadow-[0_24px_70px_rgba(2,8,20,0.42)]">
            {!cardTexture && <LanyardLoader />}
            {loadError && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#07101c]/85 p-6 text-center">
                    <p className="max-w-xs text-sm text-text-secondary">
                        The profile card could not be rendered right now. Try refreshing the page after the profile image finishes loading.
                    </p>
                </div>
            )}
            {cardTexture && (
                <Canvas
                    dpr={[1, 1.75]}
                    camera={{ position: [0, 0, cameraDistance], fov: 24 }}
                    gl={{ antialias: true, alpha: true }}
                    className="h-full w-full"
                >
                    <Suspense fallback={null}>
                        <Scene cardTexture={cardTexture} cameraDistance={cameraDistance} />
                    </Suspense>
                </Canvas>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,rgba(5,12,24,0),rgba(5,12,24,0.56))]" />
        </div>
    );
}
