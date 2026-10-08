export function showWelcome(projectName?: string): void {
  console.log("Welcome to create-rohit-app!");
  console.log("Your next full-stack application starts here.");

  if (projectName) {
    console.log(`Project name: ${projectName}`);
  }
}
