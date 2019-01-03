import Instruction from '../classes/instruction.class';

export default (opcode: any, state: any) => {
    const storeLocation = state.stack.pop();
    const storeData = state.stack.pop();
    const instruction = new Instruction(opcode.name, opcode.pc);
    instruction.setDebug();
    instruction.setDescription('memory[0x%s] = %s;', storeLocation, storeData);
    state.memory[storeLocation] = storeData;
    return instruction;
};