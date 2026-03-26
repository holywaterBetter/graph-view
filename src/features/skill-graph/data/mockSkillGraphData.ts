import type { GraphData, GraphExpansionPayload, GraphLink, GraphNode } from '../types/graph';

const baseNodes: GraphNode[] = [
  { id: 'user:me', label: 'Employee Me', type: 'user', group: 'users', metadata: { role: 'Senior HR Analyst', location: 'Seoul' } },
  { id: 'dept:hr-planning', label: 'HR Planning Department', type: 'department', group: 'departments', metadata: { owner: 'People Operations' } },
  { id: 'job:frontend-engineer', label: 'Frontend Engineer', type: 'job', group: 'jobs' },
  { id: 'job:ai-platform-engineer', label: 'AI Platform Engineer', type: 'job', group: 'jobs' },

  { id: 'skill-large:frontend', label: 'Frontend Development', type: 'skillLarge', group: 'skills' },
  { id: 'skill-medium:react', label: 'React', type: 'skillMedium', group: 'skills' },
  { id: 'skill-small:state-management', label: 'State Management', type: 'skillSmall', group: 'skills' },
  { id: 'skill-raw:zustand', label: 'Zustand', type: 'skillRaw', group: 'skills' },

  { id: 'skill-large:ai-engineering', label: 'AI Engineering', type: 'skillLarge', group: 'skills' },
  { id: 'skill-medium:llm-app', label: 'LLM Application', type: 'skillMedium', group: 'skills' },
  { id: 'skill-small:prompt-engineering', label: 'Prompt Engineering', type: 'skillSmall', group: 'skills' },
  { id: 'skill-raw:few-shot', label: 'Few-shot Prompting', type: 'skillRaw', group: 'skills' },

  { id: 'edu:agent-training', label: 'Advanced AI Agent Training', type: 'education', group: 'education' }
];

const baseLinks: GraphLink[] = [
  { source: 'user:me', target: 'dept:hr-planning', label: 'belongs_to' },

  { source: 'user:me', target: 'skill-medium:react', label: 'owns' },
  { source: 'user:me', target: 'skill-small:prompt-engineering', label: 'owns' },

  { source: 'dept:hr-planning', target: 'skill-medium:react', label: 'requires' },
  { source: 'dept:hr-planning', target: 'skill-small:prompt-engineering', label: 'requires' },

  { source: 'job:frontend-engineer', target: 'skill-large:frontend', label: 'requires' },
  { source: 'job:frontend-engineer', target: 'skill-medium:react', label: 'requires' },
  { source: 'job:ai-platform-engineer', target: 'skill-large:ai-engineering', label: 'requires' },
  { source: 'job:ai-platform-engineer', target: 'skill-small:prompt-engineering', label: 'requires' },

  { source: 'skill-large:frontend', target: 'skill-medium:react', label: 'contains' },
  { source: 'skill-medium:react', target: 'skill-small:state-management', label: 'contains' },
  { source: 'skill-small:state-management', target: 'skill-raw:zustand', label: 'contains' },

  { source: 'skill-large:ai-engineering', target: 'skill-medium:llm-app', label: 'contains' },
  { source: 'skill-medium:llm-app', target: 'skill-small:prompt-engineering', label: 'contains' },
  { source: 'skill-small:prompt-engineering', target: 'skill-raw:few-shot', label: 'contains' },

  { source: 'skill-small:prompt-engineering', target: 'edu:agent-training', label: 'education_path' },

  { source: 'skill-medium:react', target: 'job:frontend-engineer', label: 'related_job' },
  { source: 'skill-small:prompt-engineering', target: 'job:ai-platform-engineer', label: 'related_job' }
];

const expansions: Record<string, GraphExpansionPayload> = {
  'skill-medium:react': {
    nodes: [
      { id: 'skill-small:performance-optimization', label: 'Performance Optimization', type: 'skillSmall', group: 'skills' },
      { id: 'skill-raw:react-query', label: 'TanStack Query', type: 'skillRaw', group: 'skills' },
      { id: 'edu:react-architecture', label: 'React Architecture Workshop', type: 'education', group: 'education' }
    ],
    links: [
      { source: 'skill-medium:react', target: 'skill-small:performance-optimization', label: 'contains' },
      { source: 'skill-small:performance-optimization', target: 'skill-raw:react-query', label: 'contains' },
      { source: 'skill-small:performance-optimization', target: 'edu:react-architecture', label: 'education_path' },
      { source: 'job:frontend-engineer', target: 'skill-small:performance-optimization', label: 'requires' }
    ]
  },
  'skill-small:prompt-engineering': {
    nodes: [
      { id: 'skill-raw:tool-calling', label: 'Function / Tool Calling', type: 'skillRaw', group: 'skills' },
      { id: 'skill-raw:rag-prompting', label: 'RAG Prompting', type: 'skillRaw', group: 'skills' },
      { id: 'job:ai-solution-consultant', label: 'AI Solution Consultant', type: 'job', group: 'jobs' }
    ],
    links: [
      { source: 'skill-small:prompt-engineering', target: 'skill-raw:tool-calling', label: 'contains' },
      { source: 'skill-small:prompt-engineering', target: 'skill-raw:rag-prompting', label: 'contains' },
      { source: 'job:ai-solution-consultant', target: 'skill-small:prompt-engineering', label: 'requires' },
      { source: 'user:me', target: 'job:ai-solution-consultant', label: 'career_path' }
    ]
  },
  'dept:hr-planning': {
    nodes: [
      { id: 'skill-medium:workforce-analytics', label: 'Workforce Analytics', type: 'skillMedium', group: 'skills' },
      { id: 'skill-raw:sql', label: 'SQL for HR Metrics', type: 'skillRaw', group: 'skills' },
      { id: 'education:data-literacy', label: 'HR Data Literacy Program', type: 'education', group: 'education' }
    ],
    links: [
      { source: 'dept:hr-planning', target: 'skill-medium:workforce-analytics', label: 'requires' },
      { source: 'skill-medium:workforce-analytics', target: 'skill-raw:sql', label: 'contains' },
      { source: 'skill-medium:workforce-analytics', target: 'education:data-literacy', label: 'education_path' },
      { source: 'user:me', target: 'skill-medium:workforce-analytics', label: 'development_goal' }
    ]
  }
};

const withLinkIds = (links: GraphLink[]): GraphLink[] =>
  links.map((link) => ({
    ...link,
    id: `${typeof link.source === 'string' ? link.source : link.source.id}->${typeof link.target === 'string' ? link.target : link.target.id}:${link.label ?? 'related'}`
  }));

export const mockSkillGraphSeed: GraphData = {
  nodes: baseNodes,
  links: withLinkIds(baseLinks)
};

export const mockExpansionMap: Record<string, GraphExpansionPayload> = Object.fromEntries(
  Object.entries(expansions).map(([nodeId, payload]) => [
    nodeId,
    { nodes: payload.nodes, links: withLinkIds(payload.links) }
  ])
);
