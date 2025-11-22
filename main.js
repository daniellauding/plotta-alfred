#!/usr/bin/env node

const query = process.argv[2] || '';

// Alfred Script Filter output
const items = [];

if (query.length === 0) {
  items.push({
    uid: 'plotta-help',
    title: 'Type your note content...',
    subtitle: 'Create a new sticky note in Plotta',
    arg: '',
    valid: false,
    icon: {
      path: 'icon.png'
    }
  });
} else {
  // Parse the query to extract project and content
  let projectName = null;
  let content = query;
  
  // Check if query starts with project: syntax
  const projectMatch = query.match(/^project:(\w+)\s+(.+)$/);
  if (projectMatch) {
    projectName = projectMatch[1];
    content = projectMatch[2];
  }
  
  items.push({
    uid: 'plotta-create',
    title: `Create: "${content}"`,
    subtitle: projectName ? `Add to project: ${projectName}` : 'Add to Drafts',
    arg: JSON.stringify({ content, project: projectName }),
    valid: true,
    icon: {
      path: 'icon.png'
    }
  });

  // Also suggest creating a new project
  if (!projectName && content.includes(' ')) {
    const words = content.split(' ');
    if (words.length >= 2) {
      const possibleProject = words[0];
      const remainingContent = words.slice(1).join(' ');
      
      items.push({
        uid: 'plotta-create-project',
        title: `Create project "${possibleProject}" with note`,
        subtitle: `Note: "${remainingContent}"`,
        arg: JSON.stringify({ content: remainingContent, project: possibleProject, createProject: true }),
        valid: true,
        icon: {
          path: 'icon.png'
        }
      });
    }
  }
}

console.log(JSON.stringify({ items }));