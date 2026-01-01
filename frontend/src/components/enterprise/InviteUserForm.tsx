import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import Swal from 'sweetalert2';

interface InviteUserFormProps {
  enterpriseId: string;
  onClose: () => void;
  onSuccess: () => void;
  teamName?: string;
}

export const InviteUserForm = ({ enterpriseId, onClose, onSuccess, teamName }: InviteUserFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    role: "patient",
    message: "",
  });
  const [formErrors, setFormErrors] = useState<{ email?: string; role?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [manualShareReason, setManualShareReason] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (teamName && !formData.message) {
      setFormData((prev) => ({
        ...prev,
        message: `You've been invited to join the ${teamName} workspace on MealLens.`,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamName]);

  const resetForm = () => {
    setFormData({ email: "", role: "patient", message: "" });
    setFormErrors({});
    setGeneralError(null);
  };

  const validateForm = () => {
    const nextErrors: { email?: string; role?: string } = {};
    const trimmedEmail = formData.email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Please enter an email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Please provide a valid email address.";
    }

    if (!formData.role) {
      nextErrors.role = "Please select a role.";
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // CRITICAL: Validate enterpriseId before proceeding
    if (!enterpriseId || enterpriseId === 'undefined') {
      const errorMsg = "No enterprise selected — cannot invite. Please select an organization first.";
      setGeneralError(errorMsg);
      toast({
        title: "No Organization Selected",
        description: errorMsg,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const payload = {
        email: formData.email.trim(),
        role: formData.role,
        message: formData.message.trim() || undefined,
      };

      console.log('[INVITE] Sending invitation with enterpriseId:', enterpriseId, 'payload:', payload);
      const result = await api.inviteUserToEnterprise(enterpriseId, payload);

      console.log('[INVITE] Result:', result);

      if (result.success) {
        resetForm();
        
        // Always show success - invitation was created even if email failed
        if (!result.email_sent && result.invitation_link) {
          // Email failed but invitation was created - show link modal
          const fallbackReason =
            result.email_error ||
            "Email service unavailable. The invitation was created successfully - please share the link manually.";
          setManualShareReason(fallbackReason);
          setInvitationLink(result.invitation_link);
          setShowLinkModal(true);
          toast({
            title: "Invitation Created",
            description: "Invitation was created but email could not be sent. Please share the link manually.",
            variant: "default",
          });
        } else if (result.email_sent) {
          // Email sent successfully
          Swal.fire({
            title: "Invitation Sent!",
            text: `Successfully sent invitation to ${formData.email}`,
            icon: "success",
            draggable: true,
            confirmButtonColor: "#0f172a",
            timer: 3000,
            timerProgressBar: true,
          });
          onClose();
        } else {
          // Invitation created but no link returned (shouldn't happen, but handle gracefully)
          Swal.fire({
            title: "Invitation Created!",
            text: `Invitation created for ${formData.email}. ${result.email_error || 'Please check the invitations list.'}`,
            icon: "success",
            draggable: true,
            confirmButtonColor: "#0f172a",
            timer: 3000,
            timerProgressBar: true,
          });
          onClose();
        }
        
        onSuccess();
        return;
      }

      // If success is false, show the backend error message
      const errorMessage = result.error || result.message || "Failed to send invitation.";
      throw new Error(errorMessage);
      
    } catch (error: any) {
      console.error('[INVITE] Error:', error);
      console.error('[INVITE] Error type:', typeof error);
      console.error('[INVITE] Error keys:', Object.keys(error || {}));
      
      // Extract the actual error message from the backend
      let description = "Failed to send invitation.";
      
      // Handle APIError objects - check data.error first (backend format), then message
      if (error?.data?.error && typeof error.data.error === 'string') {
        description = error.data.error;
      } else if (error?.message && typeof error.message === 'string') {
        description = error.message;
      } else if (error?.data?.message && typeof error.data.message === 'string') {
        description = error.data.message;
      } else if (error?.error && typeof error.error === 'string') {
        description = error.error;
      } else if (typeof error === 'string') {
        description = error;
      } else {
        // Last resort: try to extract meaningful error
        try {
          if (error?.data && typeof error.data === 'object') {
            // Try to find any string field in the data object
            const errorFields = ['error', 'message', 'detail', 'description'];
            for (const field of errorFields) {
              if (error.data[field] && typeof error.data[field] === 'string') {
                description = error.data[field];
                break;
              }
            }
          }
          // If still no good message, use a generic one
          if (description === "Failed to send invitation.") {
            description = "Failed to send invitation. Please try again.";
          }
        } catch {
          description = "Failed to send invitation. Please try again.";
        }
      }
      
      setGeneralError(description);
      toast({
        title: "Invitation Failed",
        description,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!invitationLink) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(invitationLink);
      } else {
        const temp = document.createElement("textarea");
        temp.value = invitationLink;
        temp.style.position = "absolute";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }

      setLinkCopied(true);
      toast({
        title: "Copied",
        description: "Invitation link copied to clipboard.",
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy link. Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  const handleCloseWithSuccess = () => {
    setShowLinkModal(false);
    setInvitationLink(null);
    setManualShareReason(null);
    setLinkCopied(false);
    onClose();
  };

  if (showLinkModal && invitationLink) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Invitation Link Created</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleCloseWithSuccess}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-400 p-4 text-sm text-yellow-800">
              <strong>{manualShareReason || "Email service not configured."}</strong> Share this invitation link manually with the user.
            </div>

            <div className="space-y-2">
              <Label>Invitation Link</Label>
              <div className="flex gap-2">
                <Input value={invitationLink} readOnly className="font-mono text-sm" />
                <Button type="button" onClick={copyToClipboard} variant={linkCopied ? "default" : "outline"}>
                  {linkCopied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Send this link to {formData.email || "the invitee"} via email, text, or any other method.
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleCloseWithSuccess}>Done</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invite User {teamName ? `to ${teamName}` : ""}</CardTitle>
          <Button variant="ghost" size="sm" onClick={isLoading ? undefined : onClose} disabled={isLoading}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {generalError && (
              <div className="flex items-start gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>{generalError}</span>
              </div>
            )}

            {teamName && (
              <div className="border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                Invitation will grant access to the <strong>{teamName}</strong> workspace.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
                required
              />
              {formErrors.email && <p className="text-xs text-red-600">{formErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="nutritionist">Nutritionist</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.role && <p className="text-xs text-red-600">{formErrors.role}</p>}
              <p className="text-xs text-slate-500">
                Select the role that defines this user's access and permissions in your organization
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Add a personal message to the invitation..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

