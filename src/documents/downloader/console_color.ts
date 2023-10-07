export class ConsoleColors {
    private readonly colors = {
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        dim: '\x1b[2m',
        underscore: '\x1b[4m',
        blink: '\x1b[5m',
        reverse: '\x1b[7m',
        hidden: '\x1b[8m',
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
    };
    
    public reset(text: string): string {
        return `${this.colors.reset}${text}${this.colors.reset}`;
    }

    public bright(text: string): string {
        return `${this.colors.bright}${text}${this.colors.reset}`;
    }

    public dim(text: string): string {
        return `${this.colors.dim}${text}${this.colors.reset}`;
    }

    public underscore(text: string): string {
        return `${this.colors.underscore}${text}${this.colors.reset}`;
    }

    public blink(text: string): string {
        return `${this.colors.blink}${text}${this.colors.reset}`;
    }

    public reverse(text: string): string {
        return `${this.colors.reverse}${text}${this.colors.reset}`;
    }

    public hidden(text: string): string {
        return `${this.colors.hidden}${text}${this.colors.reset}`;
    }

    public black(text: string): string {
        return `${this.colors.black}${text}${this.colors.reset}`;
    }

    public red(text: string): string {
        return `${this.colors.red}${text}${this.colors.reset}`;
    }

    public green(text: string): string {
        return `${this.colors.green}${text}${this.colors.reset}`;
    }

    public yellow(text: string): string {
        return `${this.colors.yellow}${text}${this.colors.reset}`;
    }

    public blue(text: string): string {
        return `${this.colors.blue}${text}${this.colors.reset}`;
    }

    public magenta(text: string): string {
        return `${this.colors.magenta}${text}${this.colors.reset}`;
    }

    public cyan(text: string): string {
        return `${this.colors.cyan}${text}${this.colors.reset}`;
    }

    public white(text: string): string {
        return `${this.colors.white}${text}${this.colors.reset}`;
    }

    


}