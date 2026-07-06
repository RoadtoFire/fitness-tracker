import "./styles/base.css";
import { registerRoute, startRouter } from "./router.js";
import { isAuthenticated } from "./api.js";
import { renderLogin } from "./pages/login.js";
import { renderToday } from "./pages/today.js";
import { renderWorkouts } from "./pages/workouts.js";
import { renderWorkoutSession } from "./pages/workoutSession.js";
import { renderExercises } from "./pages/exercises.js";
import { renderNutrition } from "./pages/nutrition.js";
import { renderSteps } from "./pages/steps.js";
import { renderMore } from "./pages/more.js";

function guarded(renderFn) {
  return async (params) => {
    if (!isAuthenticated()) {
      window.location.hash = "#/login";
      return;
    }
    await renderFn(params);
  };
}

registerRoute("/login", renderLogin);
registerRoute("/today", guarded(renderToday));
registerRoute("/workouts", guarded(renderWorkouts));
registerRoute("/workouts/exercises", guarded(renderExercises));
registerRoute("/workouts/sessions/:id", guarded(renderWorkoutSession));
registerRoute("/nutrition", guarded(renderNutrition));
registerRoute("/steps", guarded(renderSteps));
registerRoute("/more", guarded(renderMore));

startRouter();
