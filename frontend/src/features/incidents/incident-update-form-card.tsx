import { Eye, PencilLine } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add update</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
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

            <div className="flex items-center gap-2">
              <Button onClick={() => onPreviewChange(false)} size="sm" type="button" variant={!isPreview ? "default" : "outline"}>
                <PencilLine className="size-4" />
                Write
              </Button>
              <Button onClick={() => onPreviewChange(true)} size="sm" type="button" variant={isPreview ? "default" : "outline"}>
                <Eye className="size-4" />
                Preview
              </Button>
            </div>

            {isPreview ? (
              <div className="prose prose-sm min-h-40 max-w-none rounded-md border p-3 dark:prose-invert">
                <Markdown remarkPlugins={[remarkGfm]}>{previewMessage || "Nothing to preview yet."}</Markdown>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea placeholder="We have identified the issue and are deploying a fix." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button disabled={isSubmitting} type="submit">
              Publish update
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
