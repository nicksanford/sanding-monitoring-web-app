import React, { useState, useEffect } from 'react';
import * as VIAM from "@viamrobotics/sdk";
import { createNotesManager, PassNote } from './lib/notesManager';

interface PassNotesProps {
  passId: string;
  viamClient: VIAM.ViamClient;
  machineId: string;
  partId: string;
  initialNotes: PassNote[]; // Add pre-fetched notes
  onNotesUpdate: React.Dispatch<React.SetStateAction<Map<string, PassNote[]>>>; // Accept state setter style
}

const PassNotes: React.FC<PassNotesProps> = ({ 
  passId, 
  viamClient, 
  machineId, 
  partId, 
  initialNotes,
  onNotesUpdate 
}) => {
  const [noteText, setNoteText] = useState<string>('');
  const [originalNoteText, setOriginalNoteText] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const notesManager = createNotesManager(viamClient, machineId);

  // Initialize with pre-fetched notes
  useEffect(() => {
    if (initialNotes.length > 0) {
      const sortedNotes = [...initialNotes].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latestNoteText = sortedNotes[0].note_text;
      setNoteText(latestNoteText);
      setOriginalNoteText(latestNoteText);
    } else {
      setNoteText('');
      setOriginalNoteText('');
    }
  }, [initialNotes]);

  const saveNote = async () => {
    setSaving(true);
    setError(null);
    setShowSuccess(false);
    
    try {
      // Allow empty notes - this acts as a "delete"
      const noteToSave = noteText.trim();
      await notesManager.savePassNote(passId, noteToSave, partId);
      
      if (noteToSave === '') {
        console.log("Empty note saved - effectively deleting note for pass:", passId);
      } else {
        console.log("Note saved successfully!");
      }
      
      // Update original text to current text
      setOriginalNoteText(noteToSave);
      
      // Update the global notes state by fetching fresh notes for this pass
      const updatedNotes = await notesManager.fetchPassNotes(passId);
      onNotesUpdate((prevNotes: Map<string, PassNote[]>) => {
        const newNotesMap = new Map(prevNotes);
        newNotesMap.set(passId, updatedNotes);
        return newNotesMap;
      });
      
      // Show success state
      setShowSuccess(true);
      
      // Reset success state after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
      
    } catch (err) {
      console.error("Error saving note:", err);
      setError("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  // Check if there are changes - now allows empty notes
  const hasChanges = noteText.trim() !== originalNoteText.trim();
  const canSave = hasChanges; // Remove the requirement for non-empty text

  // Button styling based on state
  const getButtonStyle = () => {
    if (showSuccess) {
      return {
        backgroundColor: '#10b981', // Green for success
        cursor: 'default'
      };
    } else if (saving) {
      return {
        backgroundColor: '#9ca3af', // Gray for saving
        cursor: 'not-allowed'
      };
    } else if (canSave) {
      return {
        backgroundColor: '#3b82f6', // Blue for save (always)
        cursor: 'pointer'
      };
    } else {
      return {
        backgroundColor: '#9ca3af', // Gray for disabled
        cursor: 'not-allowed'
      };
    }
  };

  // Update button text to always show "Save note"
  const getButtonText = () => {
    if (showSuccess) {
      return 'Success';
    } else if (saving) {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ 
            display: 'inline-block',
            width: '12px',
            height: '12px',
            border: '2px solid transparent',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></span>
          Saving...
        </span>
      );
    } else {
      return 'Save note';
    }
  };

  return (
    <div className="pass-notes-section" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h4 style={{
        margin: '0 0 12px 0',
        fontSize: '14px',
        fontWeight: '600',
        color: '#1f2937'
      }}>
        Notes for this pass
      </h4>

      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: '120px'
      }}>
        <textarea
          id={`pass-notes-${passId}`}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add notes about this sanding pass..."
          rows={4}
          style={{
            flexGrow: 1,
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: '8px'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d1d5db';
            e.target.style.boxShadow = 'none';
          }}
        />
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          {error && (
            <span style={{ color: '#dc2626', fontSize: '13px' }}>
              {error}
            </span>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={saveNote}
              disabled={saving || !canSave || showSuccess}
              style={{
                padding: '8px 16px',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                transition: 'background-color 0.2s',
                whiteSpace: 'nowrap',
                ...getButtonStyle()
              }}
              onMouseEnter={(e) => {
                if (canSave && !saving && !showSuccess) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (canSave && !saving && !showSuccess) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }
              }}
            >
              {getButtonText()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassNotes;