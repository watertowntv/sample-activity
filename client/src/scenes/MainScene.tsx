import { lazy } from "react";
import { useConfigKey } from "../internal/hooks/useConfig.ts";
import { SceneType } from "@activity/shared";


const DEFAULT_SCENE = SceneType.Count;
const SCENES = {
    [SceneType.Count]: lazy(() => import("./CountScene.tsx")),
} as const;


const MainScene = () => {
    const scene = useConfigKey('scene');
    const SceneComponent = SCENES[scene as keyof typeof SCENES] || SCENES[DEFAULT_SCENE];
    
    return <SceneComponent />;
};

export default MainScene;
