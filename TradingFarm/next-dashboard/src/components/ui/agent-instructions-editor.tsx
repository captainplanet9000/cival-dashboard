"use client"

import * as React from "react"
import { Brain, HelpCircle, Save, Code, FileText, Terminal, Plus, Trash2, Edit, CheckCircle2, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/utils/cn"

export interface InstructionTemplate {
  id: string
  name: string
  description: string
  content: string
  tags?: string[]
}

export interface InstructionSection {
  id: string
  title: string
  content: string
  isEditing?: boolean
}

interface AgentInstructionsEditorProps {
  instructions: string
  onSave: (instructions: string) => Promise<void>
  onChange?: (instructions: string) => void
  templates?: InstructionTemplate[]
  className?: string
  isLoading?: boolean
  savedSections?: InstructionSection[]
  onAddSection?: (section: InstructionSection) => Promise<void>
  onUpdateSection?: (section: InstructionSection) => Promise<void>
  onDeleteSection?: (sectionId: string) => Promise<void>
  onGenerateInstructions?: () => Promise<string>
}

export function AgentInstructionsEditor({
  instructions,
  onSave,
  onChange,
  templates = [],
  className,
  isLoading = false,
  savedSections = [],
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onGenerateInstructions,
}: AgentInstructionsEditorProps) {
  const [value, setValue] = React.useState(instructions)
  const [activeTab, setActiveTab] = React.useState("editor")
  const [saving, setSaving] = React.useState(false)
  const [sections, setSections] = React.useState<InstructionSection[]>(savedSections)
  const [newSection, setNewSection] = React.useState<InstructionSection>({
    id: "",
    title: "",
    content: ""
  })

  React.useEffect(() => {
    setValue(instructions)
  }, [instructions])

  React.useEffect(() => {
    setSections(savedSections)
  }, [savedSections])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    onChange?.(newValue)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(value)
    } finally {
      setSaving(false)
    }
  }

  const handleApplyTemplate = (template: InstructionTemplate) => {
    setValue(template.content)
    onChange?.(template.content)
  }

  const handleAddSection = async () => {
    if (!newSection.title || !newSection.content) return

    if (onAddSection) {
      try {
        await onAddSection({
          ...newSection,
          id: Date.now().toString(),
        })
        setNewSection({
          id: "",
          title: "",
          content: ""
        })
      } catch (error) {
        console.error("Error adding section:", error)
      }
    }
  }

  const handleUpdateSection = async (section: InstructionSection) => {
    if (onUpdateSection) {
      try {
        await onUpdateSection(section)
        setSections(sections.map(s => 
          s.id === section.id 
            ? { ...section, isEditing: false } 
            : s
        ))
      } catch (error) {
        console.error("Error updating section:", error)
      }
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (onDeleteSection) {
      try {
        await onDeleteSection(sectionId)
      } catch (error) {
        console.error("Error deleting section:", error)
      }
    }
  }

  const toggleEditSection = (id: string) => {
    setSections(sections.map(section => 
      section.id === id 
        ? { ...section, isEditing: !section.isEditing } 
        : section
    ))
  }

  const handleGenerateInstructions = async () => {
    if (onGenerateInstructions) {
      try {
        const generated = await onGenerateInstructions()
        setValue(generated)
        onChange?.(generated)
      } catch (error) {
        console.error("Error generating instructions:", error)
      }
    }
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          ElizaOS Agent Instructions
        </CardTitle>
        <CardDescription>
          Define how your trading agent behaves and processes market information
        </CardDescription>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="editor">
              <Code className="h-4 w-4 mr-2" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="sections">
              <Terminal className="h-4 w-4 mr-2" />
              Saved Sections
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="p-0">
        <TabsContent value="editor" className="p-4 pt-2 m-0">
          <div className="flex flex-col space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                  Define your agent's trading instructions, rules, and behaviors
                </div>
                {onGenerateInstructions && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={handleGenerateInstructions}
                    disabled={isLoading}
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </Button>
                )}
              </div>
              <Textarea
                value={value}
                onChange={handleChange}
                className="min-h-[400px] font-mono text-sm resize-none"
                placeholder="Enter your agent instructions here..."
                disabled={isLoading || saving}
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center text-sm text-muted-foreground">
                <HelpCircle className="h-4 w-4 mr-2" />
                <span>Instructions are processed by ElizaOS to guide agent behavior</span>
              </div>
              <Button 
                variant="default" 
                className="gap-1" 
                onClick={handleSave}
                disabled={isLoading || saving}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Instructions
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="templates" className="p-0 m-0">
          <ScrollArea className="h-[450px]">
            {templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[450px] text-center p-4">
                <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium mb-2">No Templates Available</h3>
                <p className="text-sm text-muted-foreground">
                  Templates will appear here once they're created.
                  <br />
                  They help you quickly apply common trading strategies and patterns.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {templates.map((template) => (
                  <div key={template.id} className="p-4 hover:bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-base">{template.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                        {template.tags && template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.tags.map((tag) => (
                              <span 
                                key={tag} 
                                className="px-2 py-0.5 bg-muted text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleApplyTemplate(template)}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="sections" className="p-0 m-0">
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium mb-2">Add New Section</h3>
            <div className="space-y-2">
              <Input
                placeholder="Section Title"
                value={newSection.title}
                onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
              />
              <Textarea
                placeholder="Section Content"
                className="min-h-[100px] resize-none"
                value={newSection.content}
                onChange={(e) => setNewSection({ ...newSection, content: e.target.value })}
              />
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-1"
                onClick={handleAddSection}
                disabled={!newSection.title || !newSection.content}
              >
                <Plus className="h-4 w-4" />
                Add Section
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-[300px]">
            {sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                <Terminal className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No saved sections yet. Add reusable sections above.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {sections.map((section) => (
                  <div key={section.id} className="p-4 hover:bg-muted/50">
                    {section.isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={section.title}
                          onChange={(e) => {
                            setSections(sections.map(s => 
                              s.id === section.id 
                                ? { ...s, title: e.target.value } 
                                : s
                            ))
                          }}
                          className="font-medium"
                        />
                        <Textarea
                          value={section.content}
                          onChange={(e) => {
                            setSections(sections.map(s => 
                              s.id === section.id 
                                ? { ...s, content: e.target.value } 
                                : s
                            ))
                          }}
                          className="min-h-[100px] resize-none text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEditSection(section.id)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleUpdateSection(section)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium">{section.title}</h3>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleEditSection(section.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteSection(section.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                          {section.content}
                        </p>
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setValue(value + "\n\n" + section.content)
                              onChange?.(value + "\n\n" + section.content)
                              setActiveTab("editor")
                            }}
                          >
                            Apply to Instructions
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </CardContent>
      <CardFooter className="flex justify-between py-3">
        <p className="text-xs text-muted-foreground">
          Powered by ElizaOS Natural Language Processing
        </p>
      </CardFooter>
    </Card>
  )
}
