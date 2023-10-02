import { Message, Collection } from "discord.js";

export class ComponentTimeout {

    private readonly buttonTimeouts = new Collection<string, NodeJS.Timeout>();

    // This function schedules a timeout to delete the buttons after 5 minutes
    async scheduleComponentTimeout(message: Message, timeout : number = 1000, func: (message: Message<boolean>) => Promise<void>) {
      const funcTimeout = setTimeout(async () => {
        await func(message);
      }, timeout); // 5 minutes in milliseconds 5 * 60 * 1000
    
      this.buttonTimeouts.set(message.id, funcTimeout);
    }
    
    // This function clears the timeout for a message if it exists
    async clearComponentTimeout(message: Message) {
      const timeout = this.buttonTimeouts.get(message.id);
      if (timeout) {
        clearTimeout(timeout);
        this.buttonTimeouts.delete(message.id);
      }
    }

    hasComponentTimeout(message: Message) : boolean {
        return this.buttonTimeouts.has(message.id);
    }
}

