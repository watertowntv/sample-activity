import React, { lazy } from "react";
import { useConfigKey } from "../internal/hooks/useConfig.ts";
import { SceneType } from "../config";


const DEFAULT_SCENE = SceneType.Count;
const SCENES: Record<SceneType, React.LazyExoticComponent<React.ComponentType>> = {
    [SceneType.Count]: lazy(() => import("./CountScene.tsx")),
};


const MainScene = () => {
    const scene = useConfigKey('scene');
    const SceneComponent = SCENES[scene] || SCENES[DEFAULT_SCENE];
    
    return <SceneComponent />;
};

export default MainScene;
