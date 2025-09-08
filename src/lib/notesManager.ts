import * as VIAM from "@viamrobotics/sdk";

export interface PassNote {
  pass_id: string;
  note_text: string;
  created_at: string;
  created_by: string;
}

export class NotesManager {
  private viamClient: VIAM.ViamClient;
  private machineId: string;

  constructor(viamClient: VIAM.ViamClient, machineId: string) {
    this.viamClient = viamClient;
    this.machineId = machineId;
  }

  /**
   * Save a note for a specific pass
   */
  async savePassNote(passId: string, noteText: string, partId: string): Promise<void> {
    if (!this.viamClient) {
      throw new Error("Viam client not initialized");
    }

    const now = new Date();
    console.log(`Saving note for pass ${passId}: "${noteText}"`);

    if (!partId) {
      throw new Error("No part ID available for upload");
    }

    // Create a JSON note object
    const noteData: PassNote = {
      pass_id: passId,
      note_text: noteText,
      created_at: now.toISOString(),
      created_by: "web-app"
    };

    // Convert to binary data (JSON string as bytes)
    const noteJson = JSON.stringify(noteData);
    const binaryData = new TextEncoder().encode(noteJson);

    // Upload the note as binary data
    await this.viamClient.dataClient.binaryDataCaptureUpload(
      binaryData,                     // binary data
      partId,                         // partId
      "rdk:component:generic",        // componentType
      "sanding-notes",                // componentName
      "SaveNote",                     // methodName
      ".json",                        // fileExtension
      [now, now],                     // methodParameters (start and end time)
      ["sanding-notes"]               // tags
    );

    console.log("Note saved successfully!");
  }

  /**
   * Fetch all notes for a specific pass
   */
  async fetchPassNotes(passId: string): Promise<PassNote[]> {
    if (!this.viamClient) {
      throw new Error("Viam client not initialized");
    }

    // Use correct filter properties and cast to unknown first
    const filter = {
      robotId: this.machineId,
      componentName: "sanding-notes",
      componentType: "rdk:component:generic",
      tags: ["sanding-notes"]
    } as unknown as VIAM.dataApi.Filter;

    const binaryData = await this.viamClient.dataClient.binaryDataByFilter(
      filter,
      100, // limit
      VIAM.dataApi.Order.DESCENDING,
      undefined, // no pagination token
      false,
      false,
      false
    );

    // Filter and parse notes for this specific pass
    const passNotes: PassNote[] = [];
    for (const item of binaryData.data) {
      try {
        // Use binaryDataByIds to get the actual binary data
        const noteDataArray = await this.viamClient.dataClient.binaryDataByIds([item.metadata!.binaryDataId!]);
        if (noteDataArray.length > 0) {
          // Properly access binary data from the response
          const binaryDataItem = noteDataArray[0];
          let noteBytes: Uint8Array;

          if (binaryDataItem.binary) {
            noteBytes = binaryDataItem.binary;
          } else {
            console.warn("No binary data found in response");
            continue;
          }

          const noteJson = new TextDecoder().decode(noteBytes);
          const noteData = JSON.parse(noteJson) as PassNote;

          if (noteData.pass_id === passId) {
            passNotes.push(noteData);
          }
        }
      } catch (parseError) {
        console.warn("Failed to parse note data:", parseError);
      }
    }

    console.log("Retrieved notes:", passNotes);
    return passNotes;
  }

  /**
   * Fetch notes for multiple passes
   */
  async fetchNotesForPasses(passIds: string[]): Promise<Map<string, PassNote[]>> {
    if (!this.viamClient) {
      throw new Error("Viam client not initialized");
    }

    const filter = {
      robotId: this.machineId,
      componentName: "sanding-notes",
      componentType: "rdk:component:generic",
      tags: ["sanding-notes"]
    } as unknown as VIAM.dataApi.Filter;

    const binaryData = await this.viamClient.dataClient.binaryDataByFilter(
      filter,
      500, // higher limit for multiple passes
      VIAM.dataApi.Order.DESCENDING,
      undefined,
      false,
      false,
      false
    );

    const notesByPassId = new Map<string, PassNote[]>();

    // Initialize empty arrays for all requested pass IDs
    passIds.forEach(passId => {
      notesByPassId.set(passId, []);
    });

    // Parse and organize notes by pass ID
    for (const item of binaryData.data) {
      try {
        const noteDataArray = await this.viamClient.dataClient.binaryDataByIds([item.metadata!.binaryDataId!]);
        if (noteDataArray.length > 0) {
          const binaryDataItem = noteDataArray[0];

          if (binaryDataItem.binary) {
            const noteJson = new TextDecoder().decode(binaryDataItem.binary);
            const noteData = JSON.parse(noteJson) as PassNote;

            // Only include notes for requested pass IDs
            if (passIds.includes(noteData.pass_id)) {
              const existingNotes = notesByPassId.get(noteData.pass_id) || [];
              existingNotes.push(noteData);
              notesByPassId.set(noteData.pass_id, existingNotes);
            }
          }
        }
      } catch (parseError) {
        console.warn("Failed to parse note data:", parseError);
      }
    }

    return notesByPassId;
  }

  /**
   * Update an existing note (creates a new version)
   */
  async updatePassNote(passId: string, noteText: string, partId: string): Promise<void> {
    // For now, just create a new note - in the future we could add versioning
    await this.savePassNote(passId, noteText, partId);
  }
}

/**
 * Helper function to create a NotesManager instance
 */
export function createNotesManager(viamClient: VIAM.ViamClient, machineId: string): NotesManager {
  return new NotesManager(viamClient, machineId);
}