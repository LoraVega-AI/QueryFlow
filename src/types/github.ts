// GitHub integration TypeScript definitions for QueryFlow
// This file contains all types for GitHub OAuth, repositories, and operations

export interface GitHubUser {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url: string;
  html_url: string;
  type: 'User' | 'Organization';
  company?: string;
  location?: string;
  bio?: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: GitHubUser;
  html_url: string;
  description?: string;
  fork: boolean;
  url: string;
  archive_url: string;
  assignees_url: string;
  blobs_url: string;
  branches_url: string;
  collaborators_url: string;
  comments_url: string;
  commits_url: string;
  compare_url: string;
  contents_url: string;
  contributors_url: string;
  deployments_url: string;
  downloads_url: string;
  events_url: string;
  forks_url: string;
  git_commits_url: string;
  git_refs_url: string;
  git_tags_url: string;
  git_url: string;
  issue_comment_url: string;
  issue_events_url: string;
  issues_url: string;
  keys_url: string;
  labels_url: string;
  languages_url: string;
  merges_url: string;
  milestones_url: string;
  notifications_url: string;
  pulls_url: string;
  releases_url: string;
  ssh_url: string;
  stargazers_url: string;
  statuses_url: string;
  subscribers_url: string;
  subscription_url: string;
  tags_url: string;
  teams_url: string;
  trees_url: string;
  clone_url: string;
  mirror_url?: string;
  hooks_url: string;
  svn_url: string;
  homepage?: string;
  language?: string;
  forks_count: number;
  stargazers_count: number;
  watchers_count: number;
  size: number;
  default_branch: string;
  open_issues_count: number;
  is_template?: boolean;
  topics?: string[];
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  has_downloads: boolean;
  has_discussions: boolean;
  archived: boolean;
  disabled: boolean;
  visibility: 'public' | 'private';
  pushed_at: string;
  created_at: string;
  updated_at: string;
  permissions?: {
    admin: boolean;
    maintain?: boolean;
    push: boolean;
    triage?: boolean;
    pull: boolean;
  };
  allow_rebase_merge?: boolean;
  temp_clone_token?: string;
  allow_squash_merge?: boolean;
  allow_auto_merge?: boolean;
  delete_branch_on_merge?: boolean;
  allow_merge_commit?: boolean;
  subscribers_count?: number;
  network_count?: number;
  license?: {
    key: string;
    name: string;
    spdx_id: string;
    url: string;
    node_id: string;
  };
  forks: number;
  open_issues: number;
  watchers: number;
}

export interface GitHubBranch {
  name: string;
  commit: GitHubCommit;
  protected: boolean;
  protection?: GitHubBranchProtection;
  protection_url?: string;
}

export interface GitHubCommit {
  sha: string;
  node_id: string;
  commit: {
    author: GitHubCommitAuthor;
    committer: GitHubCommitAuthor;
    message: string;
    tree: {
      sha: string;
      url: string;
    };
    url: string;
    comment_count: number;
    verification?: GitHubCommitVerification;
  };
  url: string;
  html_url: string;
  comments_url: string;
  author: GitHubUser;
  committer: GitHubUser;
  parents: GitHubCommitParent[];
}

export interface GitHubCommitAuthor {
  name: string;
  email: string;
  date: string;
}

export interface GitHubCommitVerification {
  verified: boolean;
  reason: string;
  signature?: string;
  payload?: string;
}

export interface GitHubCommitParent {
  sha: string;
  url: string;
  html_url: string;
}

export interface GitHubBranchProtection {
  required_status_checks?: {
    enforcement_level: string;
    contexts: string[];
  };
  required_pull_request_reviews?: {
    required_approving_review_count: number;
    dismiss_stale_reviews: boolean;
    require_code_owner_reviews: boolean;
    dismissal_restrictions: {
      users: GitHubUser[];
      teams: GitHubTeam[];
    };
  };
  restrictions?: {
    users: GitHubUser[];
    teams: GitHubTeam[];
    apps: GitHubApp[];
  };
  enforce_admins?: boolean;
  allow_force_pushes?: boolean;
  allow_deletions?: boolean;
  block_creations?: boolean;
}

export interface GitHubTeam {
  id: number;
  node_id: string;
  url: string;
  html_url: string;
  name: string;
  slug: string;
  description?: string;
  privacy: 'closed' | 'secret';
  permission: string;
  members_url: string;
  repositories_url: string;
  parent?: GitHubTeam;
}

export interface GitHubApp {
  id: number;
  slug: string;
  node_id: string;
  owner: GitHubUser;
  name: string;
  description: string;
  external_url: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  permissions: Record<string, string>;
  events: string[];
  installations_count?: number;
}

export interface GitHubPullRequest {
  url: string;
  id: number;
  node_id: string;
  html_url: string;
  diff_url: string;
  patch_url: string;
  issue_url: string;
  number: number;
  state: 'open' | 'closed';
  locked: boolean;
  title: string;
  user: GitHubUser;
  body?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  merged_at?: string;
  merge_commit_sha?: string;
  assignee?: GitHubUser;
  assignees: GitHubUser[];
  requested_reviewers: GitHubUser[];
  requested_teams: GitHubTeam[];
  labels: GitHubLabel[];
  milestone?: GitHubMilestone;
  draft?: boolean;
  commits_url: string;
  review_comments_url: string;
  review_comment_url: string;
  comments_url: string;
  statuses_url: string;
  head: GitHubPullRequestBranch;
  base: GitHubPullRequestBranch;
  _links: {
    self: { href: string };
    html: { href: string };
    issue: { href: string };
    comments: { href: string };
    review_comments: { href: string };
    review_comment: { href: string };
    commits: { href: string };
    statuses: { href: string };
  };
  author_association: string;
  auto_merge?: any;
  active_lock_reason?: string;
  merged: boolean;
  mergeable?: boolean;
  rebaseable?: boolean;
  mergeable_state: string;
  merged_by?: GitHubUser;
  comments: number;
  review_comments: number;
  maintainer_can_modify: boolean;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface GitHubPullRequestBranch {
  label: string;
  ref: string;
  sha: string;
  user: GitHubUser;
  repo: GitHubRepository;
}

export interface GitHubLabel {
  id: number;
  node_id: string;
  url: string;
  name: string;
  color: string;
  default: boolean;
  description?: string;
}

export interface GitHubMilestone {
  url: string;
  html_url: string;
  labels_url: string;
  id: number;
  node_id: string;
  number: number;
  title: string;
  description?: string;
  creator: GitHubUser;
  open_issues: number;
  closed_issues: number;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  due_on?: string;
  closed_at?: string;
}

export interface GitHubOAuthToken {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

export interface GitHubAuthState {
  user: GitHubUser | null;
  token: GitHubOAuthToken | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface GitHubRepositorySearchOptions {
  query?: string;
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
  type?: 'all' | 'owner' | 'public' | 'private' | 'member';
}

export interface GitHubRepositorySearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepository[];
}

export interface GitHubCloneOptions {
  repository: GitHubRepository;
  branch?: string;
  depth?: number;
  destination: string;
}

export interface GitHubCloneResult {
  success: boolean;
  localPath: string;
  branch: string;
  commit?: GitHubCommit;
  error?: string;
}

export interface GitHubSyncOptions {
  repository: GitHubRepository;
  localPath: string;
  branch?: string;
  force?: boolean;
}

export interface GitHubSyncResult {
  success: boolean;
  action: 'pull' | 'push' | 'sync';
  commits?: GitHubCommit[];
  conflicts?: GitHubConflict[];
  error?: string;
}

export interface GitHubConflict {
  file: string;
  type: 'content' | 'rename' | 'delete';
  description: string;
}

export interface GitHubWebHook {
  type: 'push' | 'pull_request' | 'release' | 'issues';
  id: string;
  name: string;
  active: boolean;
  events: string[];
  config: {
    url: string;
    content_type: string;
    secret?: string;
  };
  updated_at: string;
  created_at: string;
  url: string;
  test_url: string;
  ping_url: string;
  deliveries_url: string;
}
