export function isSameProjectId(left, right) {
  return String(left) === String(right);
}

export function findProjectByRouteId(projects, routeProjectId) {
  return projects.find(project => isSameProjectId(project.id, routeProjectId));
}

export function getProjectDataId(projects, routeProjectId) {
  return findProjectByRouteId(projects, routeProjectId)?.id ?? routeProjectId;
}
