import React, { useState, useEffect } from 'react';
import * as VIAM from "@viamrobotics/sdk";
import { createNotesManager } from './lib/notesManager';

interface PassNotesProps {
  passId: string;
  viamClient: VIAM.ViamClient;
  machineId: string;
  partId: string;
}

const PassNotes: React.FC<PassNotesProps> = ({ passId, viamClient, machineId, partId }) => {
  const [noteText, setNoteText] = useState<string>('');
  const [originalNoteText, setOriginalNoteText] = useState<string>(''); // Track original text
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false); // Track success state
  const [error, setError] = useState<string | null>(null);

  const notesManager = createNotesManager(viamClient, machineId);

  useEffect(() => {
    const fetchNotes = async () => {
      setLoading(true);
      setError(null);
      try {
        const notes = await notesManager.fetchPassNotes(passId);
        
        // Set the most recent note as the current text
        if (notes.length > 0) {
          const sortedNotes = notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const latestNoteText = sortedNotes[0].note_text;
          setNoteText(latestNoteText);
          setOriginalNoteText(latestNoteText); // Track original text
        } else {
          setNoteText('');
          setOriginalNoteText('');
        }
      } catch (err) {
        console.error("Error fetching notes:", err);
        setError("Failed to load notes");
      } finally {
        setLoading(false);
      }
    };

    if (passId && viamClient && machineId) {
      fetchNotes();
    }
  }, [passId, viamClient, machineId]);

  const saveNote = async () => {
    if (!noteText.trim()) {
      setError("Note cannot be empty");
      return;
    }

    setSaving(true);
    setError(null);
    setShowSuccess(false);
    
    try {
      await notesManager.savePassNote(passId, noteText.trim(), partId);
      console.log("Note saved successfully!");
      
      // Update original text to current text
      setOriginalNoteText(noteText.trim());
      
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

  // Check if there are changes
  const hasChanges = noteText.trim() !== originalNoteText.trim();
  const canSave = hasChanges && noteText.trim().length > 0;

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
        backgroundColor: '#3b82f6', // Blue for enabled
        cursor: 'pointer'
      };
    } else {
      return {
        backgroundColor: '#9ca3af', // Gray for disabled
        cursor: 'not-allowed'
      };
    }
  };

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
      marginTop: '16px',
      padding: '0 4px',
      borderTop: '1px solid #e2e8f0',
    }}>
      <h4 style={{
        margin: '12px 0 12px 0',
        fontSize: '14px',
        fontWeight: '600',
        color: '#1f2937'
      }}>
        Notes for this pass
      </h4>

      {loading ? (
        <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
          Loading notes...
        </div>
      ) : (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add notes about this sanding pass..."
              rows={4}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box'
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
                height: 'fit-content',
                whiteSpace: 'nowrap',
                alignSelf: 'flex-end',
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
          
          {error && (
            <div style={{ 
              marginTop: '8px'
            }}>
              <span style={{ color: '#dc2626', fontSize: '13px' }}>
                {error}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PassNotes;