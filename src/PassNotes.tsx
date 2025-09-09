import React, { useState, useEffect } from 'react';
import * as VIAM from "@viamrobotics/sdk";
import { createNotesManager, PassNote } from './lib/notesManager';

interface PassNotesProps {
  passId: string;
  viamClient: VIAM.ViamClient;
  machineId: string;
  partId: string;
  initialNotes: PassNote[];
  onNotesUpdate: (updater: (prevNotes: Map<string, PassNote[]>) => Map<string, PassNote[]>) => void;
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
      const noteToSave = noteText.trim();
      await notesManager.savePassNote(passId, noteToSave, partId);
      
      setOriginalNoteText(noteToSave);
      
      const newNote: PassNote = {
        pass_id: passId,
        note_text: noteToSave,
        created_at: new Date().toISOString(),
        created_by: "web-app"
      };
      
      onNotesUpdate((prevNotes: Map<string, PassNote[]>) => {
        const newNotesMap = new Map(prevNotes);
        const existingNotes = newNotesMap.get(passId) || [];
        const updatedNotes = [newNote, ...existingNotes];
        newNotesMap.set(passId, updatedNotes);
        return newNotesMap;
      });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      
    } catch (err) {
      console.error("Error saving note:", err);
      setError("Failed to save note");
    } finally {
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
            display: 'inline-block',
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
          style={{
            flexGrow: 1,
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
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
                padding: '6px 12px',
                backgroundColor: getButtonColor(),
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: saving || !canSave || showSuccess ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                lineHeight: '1.4'
              }}
              onMouseEnter={(e) => {
                if (canSave && !saving && !showSuccess) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (canSave && !saving && !showSuccess) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(0)';
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