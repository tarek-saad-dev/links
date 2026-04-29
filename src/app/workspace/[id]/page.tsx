import WorkspaceShell from "@/components/WorkspaceShell";

interface WorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { id } = await params;
  return <WorkspaceShell workspaceId={id} />;
}
