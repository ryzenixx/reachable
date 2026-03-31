import type { UseFormReturn } from "react-hook-form";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { IncidentUpdateValues } from "@/schemas";

type IncidentUpdateFormCardProps = {
  form: UseFormReturn<IncidentUpdateValues>;
  isPreview: boolean;
  isSubmitting: boolean;
  onPreviewChange: (preview: boolean) => void;
  onSubmit: (values: IncidentUpdateValues) => Promise<void>;
  previewMessage: string;
};

export function IncidentUpdateFormCard({
  form,
  isPreview,
  isSubmitting,
  onPreviewChange,
  onSubmit,
  previewMessage,
}: IncidentUpdateFormCardProps): React.JSX.Element {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-neutral-900">Add update</h3>
      <div className="mt-3">
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-neutral-600">Status</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="identified">Identified</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-1">
              <button
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${!isPreview ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-700"}`}
                onClick={() => onPreviewChange(false)}
                type="button"
              >
                Write
              </button>
              <button
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${isPreview ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-700"}`}
                onClick={() => onPreviewChange(true)}
                type="button"
              >
                Preview
              </button>
            </div>

            {isPreview ? (
              <div className="prose prose-sm prose-neutral min-h-32 max-w-none rounded-md border border-neutral-200 p-3 text-sm">
                <Markdown remarkPlugins={[remarkGfm]}>{previewMessage || "Nothing to preview."}</Markdown>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea className="min-h-32 text-sm" placeholder="Describe the update..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button disabled={isSubmitting} size="sm" type="submit">
              Publish update
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
