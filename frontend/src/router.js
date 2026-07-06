import { isAuthenticated } from "./api.js";

const routes = [];

export function registerRoute(pattern, render) {
  const paramNames = [];
  const regexStr = pattern.replace(/:[^/]+/g, (m) => {
    paramNames.push(m.slice(1));
    return "([^/]+)";
  });
  routes.push({ regex: new RegExp(`^${regexStr}$`), paramNames, render });
}

export function navigate(path) {
  window.location.hash = `#${path}`;
}

export function currentPath() {
  return (window.location.hash.slice(1) || "/today").split("?")[0];
}

async function handleRouteChange() {
  const path = currentPath();

  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => (params[name] = decodeURIComponent(match[i + 1])));
      await route.render(params);
      return;
    }
  }

  navigate(isAuthenticated() ? "/today" : "/login");
}

export function startRouter() {
  window.addEventListener("hashchange", handleRouteChange);
  if (!window.location.hash) {
    navigate(isAuthenticated() ? "/today" : "/login");
  } else {
    handleRouteChange();
  }
}
