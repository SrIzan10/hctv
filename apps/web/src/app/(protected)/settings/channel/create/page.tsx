import { UniversalForm } from "@/components/app/UniversalForm/UniversalForm";
import { createChannel } from "@/lib/form/actions";
import { Hash } from "lucide-react";

function CreateChannelPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-full w-full flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg">
            <Hash className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">
            Create New Channel
          </h1>
          <p className="text-muted-foreground max-w-xl">
            IRL hackathons, game streams, and more are allowed! Create another channel apart from your personal one to diversify your content.
          </p>
        </div>


        <div className="w-full max-w-md bg-card rounded-xl shadow-xl p-8 border border-border">
          <UniversalForm
            fields={[
              { label: "Channel Name", name: "name", type: "text", placeholder: "Enter channel name" },
            ]}
            schemaName="createChannel"
            action={createChannel}
          />
        </div>

        <p className="mt-6 text-sm text-muted-foreground text-center max-w-md">
          Your channel will be ready to go live immediately after creation. You can always customize settings later.
        </p>
      </div>
    </div>
  );
}

export default CreateChannelPage;