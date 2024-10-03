import { Box } from "@radix-ui/themes";
import Layout from "./components/Layout";
import CreateProposalModal from "./components/CreateProposalModal";
import Proposals from "./components/Proposals";
import useContract from "./hooks/useContract";
import { useCallback, useEffect, useState } from "react";
import { Contract } from "ethers";
import useRunners from "./hooks/useRunners";
import { Interface } from "ethers";
import ABI from "./ABI/proposal.json";
function App() {
  const readOnlyProposalContract = useContract();
  const { readOnlyProvider } = useRunners();
  const [proposals, setProposals] = useState([]);
  const multicallAbi = [
    "function tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls) returns ((bool success, bytes returnData)[] returnData)",
  ];

  const fetchProposals = useCallback(async () => {
    if (!readOnlyProposalContract) return;

    const multicallContract = await new Contract(
      import.meta.env.VITE_MULTICALL_ADDRESS,
      multicallAbi,
      readOnlyProvider
    );

    const itf = await new Interface(ABI);
    console.log(itf);

    try {
      console.log("herreee");
      const proposalCount = Number(
        await readOnlyProposalContract.proposalCount()
      );

      console.log(proposalCount);

      const proposalsIds = Array.from(
        { length: proposalCount - 1 },
        (_, i) => i + 1
      );
      console.log(proposalsIds);

      const calls = proposalsIds.map((id) => ({
        target: import.meta.env.VITE_CONTRACT_ADDRESS,
        callData: itf.encodeFunctionData("proposals", [id]),
      }));

      const responses = await multicallContract.tryAggregate.staticCall(
        true,
        calls
      );

      const decodedResults = responses.map((res) =>
        itf.decodeFunctionResult("proposals", res.returnData)
      );

      const data = decodedResults.map((proposalStruct, index) => ({
        id: index + 1,
        description: proposalStruct.description,
        amount: proposalStruct.amount,
        minRequiredVote: proposalStruct.minVotesToPass,
        votecount: proposalStruct.voteCount,
        deadline: proposalStruct.votingDeadline,
        executed: proposalStruct.executed,
      }));

      setProposals(data);
    } catch (error) {
      console.log("error fetching proposals: ", error);
    }
  }, [multicallAbi, readOnlyProposalContract, readOnlyProvider]);

  const handleProposalCreated = useCallback((event) => {
    const [id, description, amount, minVotesToPass, deadline] = event;
    setProposals((prevProposals) => [
      ...prevProposals,
      {
        id: id.toNumber(),
        description,
        amount: amount.toString(),
        minRequiredVote: minVotesToPass.toNumber(),
        voteCount: 0,
        deadline: deadline.toNumber(),
        executed: false,
      },
    ]);
  }, []);

  const handleVoted = useCallback((event) => {
    const [proposalId] = event;
    setProposals((prevProposals) =>
      prevProposals.map((proposal) =>
        proposal.id === proposalId.toNumber()
          ? {
              ...proposal,
              voteCount: proposal.voteCount + 1,
            }
          : proposal
      )
    );
  }, []);

  useEffect(() => {
    fetchProposals();

    if (readOnlyProposalContract) {
      readOnlyProposalContract.on("ProposalCreated", handleProposalCreated);
      readOnlyProposalContract.on("Voted", handleVoted);
    }

    return () => {
      if (readOnlyProposalContract) {
        readOnlyProposalContract.off("ProposalCreated", handleProposalCreated);
        readOnlyProposalContract.off("Voted", handleVoted);
      }
    };
  }, [
    fetchProposals,
    handleProposalCreated,
    handleVoted,
    readOnlyProposalContract,
  ]);

  return (
    <Layout>
      <Box className="flex justify-end p-4">
        <CreateProposalModal />
      </Box>
      <Proposals proposals={proposals} />
    </Layout>
  );
}

export default App;

// const multicallAbi = [
//   "function tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls) returns ((bool success, bytes returnData)[] returnData)",
// ];

// function App() {
//   const readOnlyProposalContract = useContract();
//   const { readOnlyProvider } = useRunners();
//   const [proposals, setProposals] = useState([]);

//   const fetchProposals = useCallback(async () => {
//     if (!readOnlyProposalContract) return;

//     const multicallContract = new Contract(
//       import.meta.env.VITE_MULTICALL_ADDRESS,
//       multicallAbi,
//       readOnlyProvider
//     );

//     const itf = new Interface(ABI);
//     console.log(itf);

//     try {
//       console.log("herreee");
//       const proposalCount = Number(
//         await readOnlyProposalContract.proposalCount()
//       );

//       console.log(proposalCount);

//       const proposalsIds = Array.from(
//         { length: proposalCount - 1 },
//         (_, i) => i + 1
//       );
//       console.log(proposalsIds);

//       const calls = proposalsIds.map((id) => ({
//         target: import.meta.env.VITE_CONTRACT_ADDRESS,
//         callData: itf.encodeFunctionData("proposals", [id]),
//       }));

//       const responses = await multicallContract.tryAggregate.staticCall(
//         true,
//         calls
//       );

//       const decodedResults = responses.map((res) =>
//         itf.decodeFunctionResult("proposals", res.returnData)
//       );

//       const data = decodedResults.map((proposalStruct) => ({
//         description: proposalStruct.description,
//         amount: proposalStruct.amount,
//         minRequiredVote: proposalStruct.minVotesToPass,
//         votecount: proposalStruct.voteCount,
//         deadline: proposalStruct.votingDeadline,
//         executed: proposalStruct.executed,
//       }));

//       setProposals(data);
//     } catch (error) {
//       console.log("error fetching proposals: ", error);
//     }
//   }, [readOnlyProposalContract, readOnlyProvider]);

//   useEffect(() => {
//     fetchProposals();
//   }, [fetchProposals]);

//   return (
//     <Layout>
//       <Box className="flex justify-end p-4">
//         <CreateProposalModal />
//       </Box>
//       <Proposals proposals={proposals} />
//     </Layout>
//   );
// }

// export default App;
