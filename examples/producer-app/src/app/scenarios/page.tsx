'use client';

import { SCENARIOS, CATEGORIES, type Category } from '@/lib/scenarios';
import { ScenarioCard } from '@/components/scenario-card';
import { CustomEventForm } from '@/components/custom-event-form';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ScenariosPage() {
  return (
    <div>
      <PageHeader
        title="Scenarios"
        description="Pre-built event templates. Fire an event to Triggrr — a matching rule must exist for an action to run. Use Seed Rule on a card to create the paired rule, Add example rules on Rules for all demos, or Create rule to set your own webhook, Slack, or email action."
      />

      <Tabs defaultValue="E-commerce">
        <TabsList className="mb-6">
          {CATEGORIES.map(cat => (
            <TabsTrigger key={cat} value={cat}>
              {cat}
            </TabsTrigger>
          ))}
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        {CATEGORIES.map((cat: Category) => (
          <TabsContent key={cat} value={cat} className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {SCENARIOS.filter(s => s.category === cat).map(scenario => (
                <ScenarioCard key={scenario.id} scenario={scenario} />
              ))}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="custom" className="mt-0">
          <div className="max-w-lg">
            <CustomEventForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
