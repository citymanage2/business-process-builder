import { Node, Edge } from "reactflow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BLOCK_METADATA, BlockType, ConnectionType, CONNECTION_METADATA, BlockData, ConnectionData } from "@shared/builderTypes";
import { Trash2 } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface PropertiesPanelProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onNodeUpdate: (nodeId: string, data: Partial<BlockData>) => void;
  onEdgeUpdate: (edgeId: string, data: Partial<ConnectionData>) => void;
  onDelete: () => void;
  readOnly?: boolean;
}

export function PropertiesPanel({
  selectedNode,
  selectedEdge,
  onNodeUpdate,
  onEdgeUpdate,
  onDelete,
  readOnly = false
}: PropertiesPanelProps) {
  if (selectedNode) {
    return (
      <NodeProperties
        node={selectedNode}
        onUpdate={onNodeUpdate}
        onDelete={onDelete}
        readOnly={readOnly}
      />
    );
  }

  if (selectedEdge) {
    return (
      <EdgeProperties
        edge={selectedEdge}
        onUpdate={onEdgeUpdate}
        onDelete={onDelete}
        readOnly={readOnly}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
      <p className="text-muted-foreground">
        Select a block or connection to view its properties
      </p>
    </div>
  );
}

function NodeProperties({
  node,
  onUpdate,
  onDelete,
  readOnly
}: {
  node: Node;
  onUpdate: (nodeId: string, data: Partial<BlockData>) => void;
  onDelete: () => void;
  readOnly?: boolean;
}) {
  const blockType = node.data.type as BlockType;
  const meta = BLOCK_METADATA[blockType];
  const IconComponent = meta ? (LucideIcons as any)[meta.icon] || LucideIcons.Box : LucideIcons.Box;

  const handleChange = (field: string, value: any) => {
    onUpdate(node.id, { [field]: value });
  };

  const handleDataChange = (field: string, value: any) => {
    onUpdate(node.id, {
      data: {
        ...node.data.data,
        [field]: value
      }
    });
  };

  return (
    <ScrollArea className="h-[calc(100vh-120px)]">
      <div className="space-y-6 py-4">
        {/* Block Type Header */}
        <div className="flex items-center gap-3 px-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: meta?.color + "20" || "#f3f4f6" }}
          >
            <IconComponent className="h-5 w-5" style={{ color: meta?.color || "#6b7280" }} />
          </div>
          <div>
            <p className="font-medium">{meta?.label || blockType}</p>
            <p className="text-sm text-muted-foreground">{meta?.description}</p>
          </div>
        </div>

        <Separator />

        {/* Basic Properties */}
        <div className="space-y-4 px-1">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={node.data.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              disabled={readOnly}
              placeholder="Enter block name..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={node.data.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              disabled={readOnly}
              placeholder="Describe this block..."
              rows={3}
            />
          </div>
        </div>

        <Separator />

        {/* Type-specific Properties */}
        <div className="space-y-4 px-1">
          <p className="text-sm font-medium text-muted-foreground">Block Properties</p>

          {/* Task-specific properties */}
          {(blockType === "task" || blockType === "manual_action" || blockType === "automated_action") && (
            <>
              <div className="space-y-2">
                <Label htmlFor="responsible">Responsible</Label>
                <Input
                  id="responsible"
                  value={node.data.data?.responsible || ""}
                  onChange={(e) => handleDataChange("responsible", e.target.value)}
                  disabled={readOnly}
                  placeholder="Who is responsible..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0"
                    value={node.data.data?.duration || ""}
                    onChange={(e) => handleDataChange("duration", parseInt(e.target.value) || 0)}
                    disabled={readOnly}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationUnit">Unit</Label>
                  <Select
                    value={node.data.data?.durationUnit || "minutes"}
                    onValueChange={(v) => handleDataChange("durationUnit", v)}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="durationUnit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Condition-specific properties */}
          {(blockType === "condition" || blockType === "exclusive_gateway") && (
            <div className="space-y-2">
              <Label htmlFor="condition">Condition Expression</Label>
              <Textarea
                id="condition"
                value={node.data.data?.condition || ""}
                onChange={(e) => handleDataChange("condition", e.target.value)}
                disabled={readOnly}
                placeholder="Enter condition..."
                rows={2}
              />
            </div>
          )}

          {/* Timer-specific properties */}
          {blockType === "timer_event" && (
            <div className="space-y-2">
              <Label htmlFor="timerValue">Timer Duration</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="timerValue"
                  type="number"
                  min="0"
                  value={node.data.data?.timerValue || ""}
                  onChange={(e) => handleDataChange("timerValue", parseInt(e.target.value) || 0)}
                  disabled={readOnly}
                  placeholder="0"
                />
                <Select
                  value={node.data.data?.timerUnit || "minutes"}
                  onValueChange={(v) => handleDataChange("timerUnit", v)}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Seconds</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* API Call properties */}
          {blockType === "api_call" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="apiUrl">API URL</Label>
                <Input
                  id="apiUrl"
                  value={node.data.data?.apiUrl || ""}
                  onChange={(e) => handleDataChange("apiUrl", e.target.value)}
                  disabled={readOnly}
                  placeholder="https://api.example.com/endpoint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiMethod">Method</Label>
                <Select
                  value={node.data.data?.apiMethod || "GET"}
                  onValueChange={(v) => handleDataChange("apiMethod", v)}
                  disabled={readOnly}
                >
                  <SelectTrigger id="apiMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Notification properties */}
          {blockType === "send_notification" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="notificationChannel">Channel</Label>
                <Select
                  value={node.data.data?.notificationChannel || "email"}
                  onValueChange={(v) => handleDataChange("notificationChannel", v)}
                  disabled={readOnly}
                >
                  <SelectTrigger id="notificationChannel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="push">Push Notification</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notificationMessage">Message Template</Label>
                <Textarea
                  id="notificationMessage"
                  value={node.data.data?.notificationMessage || ""}
                  onChange={(e) => handleDataChange("notificationMessage", e.target.value)}
                  disabled={readOnly}
                  placeholder="Enter notification message..."
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Role/Department properties */}
          {(blockType === "role" || blockType === "department") && (
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Input
                id="assignedTo"
                value={node.data.data?.assignedTo || ""}
                onChange={(e) => handleDataChange("assignedTo", e.target.value)}
                disabled={readOnly}
                placeholder="Person or team..."
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Style Settings */}
        <div className="space-y-4 px-1">
          <p className="text-sm font-medium text-muted-foreground">Appearance</p>
          
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="color"
                value={node.data.style?.color || meta?.color || "#6b7280"}
                onChange={(e) => handleChange("style", { ...node.data.style, color: e.target.value })}
                disabled={readOnly}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={node.data.style?.color || meta?.color || "#6b7280"}
                onChange={(e) => handleChange("style", { ...node.data.style, color: e.target.value })}
                disabled={readOnly}
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Metadata */}
        <Separator />
        <div className="space-y-2 px-1">
          <p className="text-sm font-medium text-muted-foreground">Metadata</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">ID: {node.id}</Badge>
            <Badge variant="outline">Type: {blockType}</Badge>
            <Badge variant="outline" style={{ borderColor: meta?.color, color: meta?.color }}>
              {meta?.category}
            </Badge>
          </div>
        </div>

        {/* Delete Button */}
        {!readOnly && (
          <>
            <Separator />
            <div className="px-1">
              <Button variant="destructive" className="w-full" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Block
              </Button>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}

function EdgeProperties({
  edge,
  onUpdate,
  onDelete,
  readOnly
}: {
  edge: Edge;
  onUpdate: (edgeId: string, data: Partial<ConnectionData>) => void;
  onDelete: () => void;
  readOnly?: boolean;
}) {
  const connectionType = (edge.data?.connectionType || "sequence_flow") as ConnectionType;
  const meta = CONNECTION_METADATA[connectionType];

  const handleChange = (field: string, value: any) => {
    onUpdate(edge.id, { [field]: value });
  };

  return (
    <ScrollArea className="h-[calc(100vh-120px)]">
      <div className="space-y-6 py-4">
        {/* Connection Type Header */}
        <div className="flex items-center gap-3 px-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: meta.color + "20" }}
          >
            <div 
              className="w-6 h-0.5 rounded-full"
              style={{ 
                backgroundColor: meta.color,
                borderStyle: meta.strokeStyle === "dashed" ? "dashed" : "solid"
              }} 
            />
          </div>
          <div>
            <p className="font-medium">{meta.label}</p>
            <p className="text-sm text-muted-foreground">Connection between blocks</p>
          </div>
        </div>

        <Separator />

        {/* Properties */}
        <div className="space-y-4 px-1">
          <div className="space-y-2">
            <Label htmlFor="connectionType">Connection Type</Label>
            <Select
              value={connectionType}
              onValueChange={(v) => handleChange("connectionType", v)}
              disabled={readOnly}
            >
              <SelectTrigger id="connectionType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONNECTION_METADATA).map(([type, meta]) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-0.5"
                        style={{ 
                          backgroundColor: meta.color,
                          borderStyle: meta.strokeStyle === "dashed" ? "dashed" : "solid"
                        }} 
                      />
                      {meta.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={edge.data?.label || ""}
              onChange={(e) => handleChange("label", e.target.value)}
              disabled={readOnly}
              placeholder="Connection label..."
            />
          </div>

          {connectionType === "conditional_flow" && (
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Textarea
                id="condition"
                value={edge.data?.condition || ""}
                onChange={(e) => handleChange("condition", e.target.value)}
                disabled={readOnly}
                placeholder="Enter condition for this path..."
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Metadata */}
        <Separator />
        <div className="space-y-2 px-1">
          <p className="text-sm font-medium text-muted-foreground">Metadata</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">ID: {edge.id}</Badge>
            <Badge variant="outline">Source: {edge.source}</Badge>
            <Badge variant="outline">Target: {edge.target}</Badge>
          </div>
        </div>

        {/* Delete Button */}
        {!readOnly && (
          <>
            <Separator />
            <div className="px-1">
              <Button variant="destructive" className="w-full" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Connection
              </Button>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
