import { Badge } from "../components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <Badge tone="success" className="mb-2 w-fit">
            Fondation technique — Phase 1
          </Badge>
          <CardTitle>BIOVOLAILLES</CardTitle>
          <CardDescription>
            Plateforme de gestion et de traçabilité avicole. L&apos;architecture, la base de données et le
            système d&apos;authentification sont en place ; les écrans métier arrivent dans les phases
            suivantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-secondary">Voir ARCHITECTURE.md pour le détail technique.</CardContent>
      </Card>
    </main>
  );
}
