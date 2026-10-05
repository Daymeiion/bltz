"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from "@heroui/react";

type Props = {
  bioText: string;
  playerName: string;
  playerLevel?: string;
  playerStatus?: string;
};

export default function BioModal({ bioText, playerName, playerLevel, playerStatus }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <>
      <Button
        color="secondary"
        onPress={onOpen}
        className="inline-flex items-center bg-white/[0.03] rounded-md px-3 py-1.5 text-xs md:text-sm font-medium text-white hover:bg-gray-700/70 transition-all duration-300 ease-in-out relative overflow-hidden group"
      >
        <span className="relative z-10">Read more</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out"></div>
      </Button>
      
      <Modal
        backdrop="opaque"
        size="xl"
        classNames={{
          body: "py-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent",
          backdrop: "bg-[#292f46]/50 backdrop-opacity-40",
          base: "border-[#292f46] bg-[#19172c] dark:bg-[#0c0a1f] text-[#a8b0d3] max-w-xl mx-auto px-6 rounded-md max-h-[75vh] overflow-hidden",
          header: "",
          footer: "",
          closeButton: "hover:bg-white/5 active:bg-white/10 absolute top-4 right-4",
        }}
        isOpen={isOpen}
        radius="md"
        onOpenChange={onOpenChange}
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col pt-6 pb-4 px-6 gap-1 !bg-transparent">
                <h3 className="text-xl font-bebas tracking-widest text-white flex items-center">
                  {playerName} <span className="text-xs font-oswald font-thin ml-2" style={{ fontFamily: 'Oswald, sans-serif' }}>Biography</span>
                </h3>
                {playerLevel && playerStatus && (
                    <p className="text-xs text-white/60 text-base font-normal tracking-wide" style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 'normal' }}>
                      {playerLevel.toLowerCase()} {playerStatus.toLowerCase()} football player
                    </p>
                )}
              </ModalHeader>
              <ModalBody className="!bg-transparent">
                <div className="text-white/90 leading-relaxed text-left text-sm whitespace-pre-line">
                  {bioText.split('\n').map((line, index) => {
                    // Check if line is a section title (starts with capital letter, no period, and is followed by content)
                    if (line.match(/^(Early Life|College Career|Professional Career|Personal)$/)) {
                      return (
                        <div key={index} className="text-[#FFBB00] font-bebas text-base mt-4 mb-2 first:mt-0">
                          {line}
                        </div>
                      );
                    }
                    return <div key={index}>{line}</div>;
                  })}
                </div>
              </ModalBody>
              <ModalFooter className="!bg-transparent !p-0">
                <div className="w-full p-6 flex justify-end gap-0">
                  <Button color="default" variant="light" onPress={onClose} className="text-white">
                    Close
                  </Button>
                  <Button 
                    className="bg-[#FFBB00] text-black hover:bg-[#FFBB00]/90 shadow-lg shadow-[#FFBB00]/20" 
                    onPress={onClose}
                  >
                    Follow Player
                  </Button>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
