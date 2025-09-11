import React, { useState, useEffect } from 'react';
import * as VIAM from "@viamrobotics/sdk";
import { createNotesManager, PassNote } from './lib/notesManager';

export interface PassNotesProps {
  passId: string;
  viamClient: VIAM.ViamClient;
  machineId: string;
  partId: string;
  initialNotes: PassNote[];
  isLoading: boolean;
  onNotesUpdate: React.Dispatch<React.SetStateAction<Map<string, PassNote[]>>>;
}

const PassNotes: React.FC<PassNotesProps> = ({
  passId,
  viamClient,
  machineId,
  partId,
  initialNotes,
  isLoading,
  onNotesUpdate,
}) => {
  const [noteText, setNoteText] = useState<string>('');
  const [originalNoteText, setOriginalNoteText] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const notesManager = createNotesManager(viamClient, machineId);

  useEffect(() => {
    // If we have initial notes, use them
    if (initialNotes.length > 0) {
      const sortedNotes = [...initialNotes].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latestNoteText = sortedNotes[0].note_text;
      setNoteText(latestNoteText);
      setOriginalNoteText(latestNoteText);
    } else {
      // Don't fetch here - let AppInterface handle it
      setNoteText('');
      setOriginalNoteText('');
    }
  }, [passId, initialNotes]); // Add initialNotes to dependencies

  const saveNote = async () => {
    if (saving) return; // Prevent double-clicks
    
    setSaving(true);
    setError(null);
    setShowSuccess(false); // Reset success state
    
    try {
      const noteToSave = noteText.trim();
      
      // Get the created note directly from the savePassNote function
      const newNote = await notesManager.savePassNote(passId, noteToSave, partId);
      console.log("UI received saved note confirmation"); // Add this for debugging
      
      // Update UI state with the returned note object
      setOriginalNoteText(noteToSave);
      
      // Update the notes collection with the new note
      onNotesUpdate((prevNotes) => {
        const newMap = new Map(prevNotes);
        const currentNotes = newMap.get(passId) || [];
        newMap.set(passId, [newNote, ...currentNotes]);
        return newMap;
      });
      
      // Show success state
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      
    } catch (err) {
      console.error("Error saving note:", err);
      setError("Failed to save note");
    } finally {
      // Ensure this runs even if there's an error
      setSaving(false);
    }
  };

  const hasChanges = noteText.trim() !== originalNoteText.trim();
  const canSave = hasChanges;

  const getButtonText = () => {
    if (showSuccess) return 'Success';
    if (saving) {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ 
            display: 'block',
            width: '12px',
            height: '12px',
            border: '2px solid transparent',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Saving...
        </span>
      );
    }
    return 'Save note';
  };

  const getButtonColor = () => {
    if (showSuccess) return '#10b981';
    if (saving || !canSave) return '#9ca3af';
    return '#3b82f6';
  };

  return (
    <div className="pass-notes-container">
      <h4 style={{
        position: 'sticky',
        top: 0,
        backgroundColor: '#fafafa',
        zIndex: 1,
        margin: 0,
        padding: '0 0 8px 4px',
      }}>
        Notes for this pass
      </h4>
      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ 
            display: 'inline-block',
            width: '24px',
            height: '24px',
            border: '3px solid rgba(0,0,0,0.1)',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{ marginLeft: '10px', color: '#6b7280' }}>Loading notes...</span>
        </div>
      )}
      {!isLoading && (
        <>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add notes about this pass..."
            style={{
              width: '100%',
              height: '100px',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
            }}
            disabled={saving}
          />
          
          {/* Error message */}
          {error && (
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '4px',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}
          
          {/* Save button */}
          <button
            onClick={saveNote}
            disabled={!canSave || saving}
            style={{
              marginTop: '12px',
              padding: '10px 16px',
              backgroundColor: getButtonColor(),
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: canSave && !saving ? 'pointer' : 'not-allowed',
              opacity: canSave && !saving ? 1 : 0.5,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100px'
            }}
          >
            {getButtonText()}
          </button>
        </>
      )}
    </div>
  );
};

export default PassNotes;