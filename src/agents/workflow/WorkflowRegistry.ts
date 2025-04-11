import { WorkflowTemplate } from './WorkflowTemplate';
import { TechnicalAnalysisTemplate } from './templates/TechnicalAnalysisTemplate';
import { MarketResearchTemplate } from './templates/MarketResearchTemplate';

/**
 * Registry for workflow templates. Provides a central place to register, retrieve,
 * and manage workflow templates.
 */
export class WorkflowRegistry {
    private templates: Map<string, WorkflowTemplate> = new Map();

    /**
     * Creates a new WorkflowRegistry with default templates.
     */
    constructor() {
        this.registerDefaultTemplates();
    }

    /**
     * Registers a workflow template.
     * @param template The workflow template to register
     */
    registerTemplate(template: WorkflowTemplate): void {
        const metadata = template.getMetadata();
        if (this.templates.has(metadata.id)) {
            console.warn(`Workflow template with ID '${metadata.id}' is already registered. Overwriting.`);
        }
        this.templates.set(metadata.id, template);
        console.log(`Registered workflow template: ${metadata.name} (${metadata.id}), version ${metadata.version}`);
    }

    /**
     * Gets a workflow template by its ID.
     * @param id The ID of the template to retrieve
     * @returns The workflow template, or undefined if not found
     */
    getTemplate(id: string): WorkflowTemplate | undefined {
        return this.templates.get(id);
    }

    /**
     * Gets all registered workflow templates.
     * @returns An array of all registered workflow templates
     */
    getAllTemplates(): WorkflowTemplate[] {
        return Array.from(this.templates.values());
    }

    /**
     * Gets metadata for all registered workflow templates.
     * @returns An array of metadata for all registered workflow templates
     */
    getAllTemplateMetadata(): any[] {
        return this.getAllTemplates().map(template => template.getMetadata());
    }

    /**
     * Unregisters a workflow template.
     * @param id The ID of the template to unregister
     * @returns True if the template was unregistered, false otherwise
     */
    unregisterTemplate(id: string): boolean {
        const success = this.templates.delete(id);
        if (success) {
            console.log(`Unregistered workflow template: ${id}`);
        }
        return success;
    }

    /**
     * Registers the default workflow templates.
     */
    private registerDefaultTemplates(): void {
        // Register the technical analysis template
        this.registerTemplate(new TechnicalAnalysisTemplate());
        
        // Register the market research template
        this.registerTemplate(new MarketResearchTemplate());
        
        console.log('Default workflow templates registered');
    }

    /**
     * Finds workflow templates by category.
     * @param category The category to search for
     * @returns An array of workflow templates in the specified category
     */
    findTemplatesByCategory(category: string): WorkflowTemplate[] {
        return this.getAllTemplates().filter(
            template => template.getMetadata().category === category
        );
    }

    /**
     * Finds workflow templates by tags.
     * @param tags The tags to search for
     * @param matchAll If true, only returns templates that match all tags; otherwise, returns templates that match any tag
     * @returns An array of workflow templates matching the specified tags
     */
    findTemplatesByTags(tags: string[], matchAll: boolean = false): WorkflowTemplate[] {
        return this.getAllTemplates().filter(template => {
            const templateTags = template.getMetadata().tags || [];
            if (matchAll) {
                // Must match all specified tags
                return tags.every(tag => templateTags.includes(tag));
            } else {
                // Match any of the specified tags
                return tags.some(tag => templateTags.includes(tag));
            }
        });
    }

    /**
     * Searches for workflow templates by name or description.
     * @param searchQuery The search query to match against name or description
     * @returns An array of workflow templates matching the search query
     */
    searchTemplates(searchQuery: string): WorkflowTemplate[] {
        const query = searchQuery.toLowerCase();
        return this.getAllTemplates().filter(template => {
            const metadata = template.getMetadata();
            return metadata.name.toLowerCase().includes(query) || 
                   metadata.description.toLowerCase().includes(query);
        });
    }
} 